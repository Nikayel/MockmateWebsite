> Module **8.1** (Diagnosis) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [7.6](./l7-rsc-fetching.md) · Next: [8.2](./l8-memo-economics.md)

# L8 · Diagnosis

Before you optimize a single render you have to see it correctly. After this module you can catch the two mistakes that start almost every React performance thread: assuming a child re-renders because "its props changed" (it does not, its parent rendering cascades down), and reaching for `useMemo`/`React.memo` by guesswork instead of reading the Profiler to find the one commit and the one trigger that actually cost you.

### ajr-l8-render-propagation-model: The default render-propagation model

- **id:** `ajr-l8-render-propagation-model`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** react, performance, rerender

#### Learn

The single most useful sentence about React performance: **when a component renders, React renders all of its descendants by default, whether or not their props changed.** Rendering recurses down the tree. Props are not consulted to decide whether to recurse.

Watch this three-level tree:

```tsx
function Parent() {
  const [count, setCount] = useState(0);
  return (
    <section>
      <button onClick={() => setCount((c) => c + 1)}>count: {count}</button>
      <Child />
    </section>
  );
}

function Child() {
  console.log("Child render");
  return <Grandchild label="I never change" />;
}

function Grandchild({ label }: { label: string }) {
  console.log("Grandchild render");
  return <p>{label}</p>;
}
```

Click the button once. `count` changes, so `Parent` re-runs. Re-running `Parent` produces a fresh `<Child />` element, and React recurses into `Child`, which produces a fresh `<Grandchild label="..." />` element, and React recurses into that too. You see both `"Child render"` and `"Grandchild render"` logged on every click, even though neither takes a prop that changed and `Grandchild`'s `label` is the same string forever.

Why would React waste work like that? Because rendering is not the expensive part. A "render" is just calling your function to produce element objects, then diffing that output against the previous output. Only the diff result (the actual DOM mutations) is costly, and the diff is what protects it. So React's default is "re-render the subtree, diff the output, commit only what moved." Wasted renders are the intended default, not a bug.

You stop the cascade two ways, and the order matters.

**Composition first (free).** If the state lives in `Parent` but the subtree below it does not depend on that state, lift the subtree so it is created *above* the state and passed in as `children`:

```tsx
function Parent({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);
  return (
    <section>
      <button onClick={() => setCount((c) => c + 1)}>count: {count}</button>
      {children}
    </section>
  );
}
// usage: <Parent><Child /></Parent>
```

Now `<Child />` is created in whatever renders `<Parent>`, which does not re-run on `count++`. `Parent` just re-hands the same `children` element reference. React sees an unchanged element and bails out. No `memo`, no compare cost.

**`React.memo` second (opt-in compare).** When the subtree genuinely must live under the changing state, wrap it: `const Child = React.memo(Child)`. That inserts a shallow `Object.is` compare on each prop before recursing; if all props match, React reuses the previous render.

**Interview nuance:** "does a re-render update the DOM?" No. Re-rendering runs the function and diffs; if the output is identical, React commits zero DOM changes. A wasted render is wasted CPU, not a visual bug, and often not worth fixing unless the leaf is heavy or the update is frequent.

Recap: a parent render recurses into every descendant regardless of props; React diffs output, not props, by default; composition (element identity) is the free fix and `React.memo` (shallow compare) is the opt-in one.

#### See it live

**Demo (react-demo):** a Parent -> Child -> Grandchild tree with a render-count badge on each level, plus a checkbox that wraps Child in `React.memo`.

A widget showing three nested cards. The outer card is `Parent` and holds a big "count: N" button; inside it sits the `Child` card; inside that sits the `Grandchild` card. Each card has a small render-count badge in its corner that increments every time that component's function runs. Above the tree is a checkbox labeled "Wrap Child in React.memo". The Child level is built around this snippet:

```tsx
const Child = React.memo(function Child() {
  childRenders.current += 1; // drives the Child badge
  return (
    <div className="card">
      Child · renders: {childRenders.current}
      <Grandchild label="static" />
    </div>
  );
});
```

The widget swaps between the plain and `React.memo`-wrapped Child when the checkbox flips. Clicking the button always increments the Parent badge and passes no new props to Child.

**Watch:** with the checkbox off, click the button and all three badges (Parent, Child, Grandchild) flash and climb together, even though only Parent's state changed and Child/Grandchild receive no changing props. Tick the checkbox on and keep clicking: the Parent badge keeps climbing while the Child and Grandchild badges freeze. This is real React behavior, not an approximation. It proves the render was triggered by the parent rendering (the cascade), not by any prop changing, and that `memo`'s shallow compare is exactly what prunes the recursion.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Explain why a `HeavyChild` with no props re-renders every time its parent does `count++`, then fix it two ways: with `React.memo`, and with the `children` pass-through. Say which you would reach for first and why.

**Think about:**
- Does React diff props before rendering a child by default?
- Is a re-render the same thing as a DOM update?
- What is the cheapest fix, `memo` or composition?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

`HeavyChild` re-renders because its parent re-renders, and a parent render recurses into every descendant by default. React does not diff props to decide whether to recurse. When `setCount` runs, the parent function re-runs, re-creates the `<HeavyChild />` element, and React calls `HeavyChild` again. "No props" does not protect it, because props were never the trigger.

Fix one, `React.memo`:

```tsx
const HeavyChild = React.memo(function HeavyChild() {
  // ...expensive render...
  return <BigThing />;
});
```

`memo` inserts a shallow `Object.is` compare per prop before recursing. With no props (or unchanged props) the compare passes and React skips calling `HeavyChild`, reusing its last output.

Fix two, composition (pass as `children`):

```tsx
function Parent({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);
  return (<><button onClick={() => setCount((c) => c + 1)}>{count}</button>{children}</>);
}
// usage: <Parent><HeavyChild /></Parent>
```

Now `<HeavyChild />` is created in the component that renders `<Parent>`, which does not re-run on `count++`. `Parent` re-hands the identical `children` element reference, React sees unchanged element identity, and bails out of the subtree.

**Which first:** composition. It is free (no per-render compare, no `memo` wrapper to maintain) and it works by element identity, which cannot go stale. Reach for `memo` only when the heavy subtree genuinely must live under the changing state and cannot be lifted.

**WHY at the mechanism level:** React renders top-down. Re-running a component creates fresh child elements and React recurses by default. The only two ways to prune that recursion are a props shallow-compare (`memo`) or element-reference identity (composition, where the same element object is passed straight through).

**How to spot it in review:** state declared high in the tree with expensive leaves below it, especially state that changes often (per keystroke, per interval, per pointer move) sitting above a big or costly subtree.

**Production symptom:** wide wasted renders burning CPU on every update, showing up as janky typing, dropped frames while dragging, or a laggy counter/timer in a large screen.

**Common misconception corrected:** "changing a prop triggers the child's render." No. The *parent rendering* cascades down; the prop change (if any) is a side effect of that, not the cause. A child with no props at all still re-renders when its parent does.

**Self-check rubric:**
- [ ] I stated that a parent render recurses into descendants regardless of props.
- [ ] I explained React diffs output, not props, by default.
- [ ] I gave both fixes with correct code (`React.memo` and `children` pass-through).
- [ ] I said composition is the cheaper/first fix and why (element identity, no compare cost).
- [ ] I corrected the "prop change triggers the render" misconception.

#### Practice: real-world variant (save, then reveal)

**Prompt:** At an analytics dashboard startup, a `<Dashboard>` holds a `hoveredPointId` in `useState` so a tooltip can follow the cursor over a chart. On every `mousemove` the whole dashboard re-renders, including a `<DataGrid>` of 2,000 rows sitting beside the chart, and the page drops to ~15fps while hovering. Diagnose why the grid re-renders on mouse move, and propose a fix that does not require memoizing 2,000 rows. Name a second structural option.

**Model answer (revealed on demand):**

The grid re-renders because `hoveredPointId` lives in `<Dashboard>`, the common parent. Every `mousemove` calls `setHoveredPointId`, which re-runs `Dashboard`, which recurses into all of its children, including `<DataGrid>`. The grid takes no prop derived from the hovered point, but that is irrelevant: the parent rendering cascades down regardless of props.

The cheapest correct fix is to **stop hoisting the fast-changing state above the slow subtree.** Move `hoveredPointId` into a small component that wraps only the chart and tooltip, so the mouse-move state changes re-render just that island:

```tsx
function Dashboard() {
  return (
    <>
      <ChartWithTooltip />   {/* owns hoveredPointId */}
      <DataGrid rows={rows} /> {/* now outside the state that changes on hover */}
    </>
  );
}
```

Because `DataGrid` is no longer a descendant of the component whose state changes, `mousemove` never re-runs it. This is the same "colocate the state" move as composition: put the volatile state as low as it can go.

**Why this beats memoizing rows:** wrapping 2,000 rows in `React.memo` still pays a shallow compare per row on every commit, still re-runs `DataGrid` itself, and adds a fragile per-row prop-stability requirement. Colocation removes the render entirely instead of making a wasteful render cheaper.

**Second structural option:** if the tooltip position truly must be read at the dashboard level, keep it out of React state altogether. Track the hovered point in a `ref` and drive the tooltip's transform imperatively (or via a CSS variable / a tiny external store subscribed only by the tooltip). No `setState` per `mousemove` means no render per `mousemove`, so the grid never even enters the conversation.

**Production symptom to recognize:** frame rate collapsing specifically during a continuous gesture (hover, drag, scroll-linked state) while a large list or table shares a parent with that gesture's state. The Profiler will show a commit on every pointer event with the big list re-rendering each time.

---

### ajr-l8-profiler-diagnosis: Diagnosing with the Profiler

- **id:** `ajr-l8-profiler-diagnosis`  ·  **difficulty:** hard  ·  **est:** 14 min  ·  **demo:** react-demo  ·  **skills:** react, profiler, performance

#### Learn

Once you accept that renders cascade, the next skill is refusing to memoize by guesswork. The React DevTools **Profiler** tells you exactly which commit was expensive and why it happened, so you fix the one trigger that matters instead of sprinkling `useMemo` and hoping.

Record an interaction, and the Profiler gives you a flamegraph per **commit** (one commit is one batch of state changes React flushed to the DOM). For each rendered component it reports two numbers:

- **actualDuration:** how long *this* render actually took.
- **baseDuration:** the estimated cost to render it with no memoization, an "if nothing bailed out" baseline.

Read the relationship. If `actualDuration` is close to `baseDuration`, nothing was memoized away, the full subtree re-rendered, and that is your hot path. If `actualDuration` is much smaller than `baseDuration`, memoization is already doing its job and this commit is not your problem.

The other half is **"why did this render?"** Enable "Record why each component rendered" in the Profiler settings and each component in the flamegraph gets a reason, always one of three:

1. **Props changed** (and it lists which prop).
2. **Hook changed** (its own state, or a subscribed context).
3. **The parent rendered** (the cascade from lesson one).

Concrete case: a form with a controlled `<input>` and a sibling `<Table rows={rows} />` of 500 rows. Every keystroke feels sticky.

```tsx
function Form() {
  const [query, setQuery] = useState("");
  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <Table rows={rows} />  {/* rows never changes */}
    </>
  );
}
```

Type one character. The Profiler shows a fat bar for the commit, and hovering `Table` says "rendered because: the parent rendered." Not props, not a hook. `rows` never changed. `Table` is only re-rendering because `Form`'s `query` state cascades. `actualDuration` ~ `baseDuration` on `Table` confirms nothing bailed out. The one-line fix the flamegraph points you to is `const Table = React.memo(Table)` (rows is stable, so the shallow compare passes), or lifting the input into its own component so `query` no longer sits above `Table`.

**Interview nuance:** always profile a **production build**. The dev build is much slower and, under `StrictMode`, renders each component twice on purpose, so a dev flamegraph overstates cost and can invent renders that never happen in production. Measure the artifact you ship, then decide.

Recap: the Profiler attributes every commit to props / hook / parent, and `actualDuration` vs `baseDuration` tells you whether memoization is helping. Read the flamegraph, fix the one real trigger, and only trust production-build timings.

#### See it live

**Demo (react-demo):** a mini render-timeline over a form whose keystrokes re-render a 500-row table; each commit is a bar colored by duration with a "rendered because" tooltip, and a one-line-fix toggle.

A widget with a controlled search `<input>` on top and a 500-row `<Table>` below it. Under them runs a horizontal **commit timeline**: every keystroke drops a new bar, its height/color scaled by that commit's measured `actualDuration` (green sliver = cheap, red fat bar = expensive). Hovering a bar shows a tooltip with the most expensive component, its "rendered because" reason, and its `actualDuration` vs `baseDuration`. A toggle labeled "Apply fix (memoize Table)" flips the table between the plain and memoized versions. The timeline is built around this instrumentation:

```tsx
const Table = applyFix ? React.memo(TableImpl) : TableImpl;

function onRenderCommit(id, phase, actualDuration, baseDuration) {
  // React Profiler component's callback -> push a bar
  setBars((b) => [...b, { actualDuration, baseDuration, reason: lastReason.current }]);
}

<Profiler id="Form" onRender={onRenderCommit}>
  <Form rows={rows /* 500, stable */} />
</Profiler>
```

**Watch:** with the fix off, every keystroke drops a fat red bar and its tooltip reads "Table rendered because: the parent rendered, actualDuration approximately baseDuration." Flip "Apply fix (memoize Table)" on and keep typing: the bars collapse to thin green slivers and the tooltip now reads "Table did not re-render (memo bail-out)." Be honest about what this shows: the bar heights come from the real React `<Profiler>` `onRender` callback (`actualDuration` is genuine), but this is an in-page timeline, a simplified stand-in for the DevTools flamegraph, and it runs in a dev-style build, so the absolute milliseconds are illustrative. What is faithful is the shape: one fat commit per keystroke attributed to "parent rendered," collapsing to slivers once the specific trigger is stabilized.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Identify, using the Profiler, which commit is expensive and which prop or state triggered it, then write the one-line fix, reading the flamegraph rather than the code. You are given: keystrokes in a form produce fat commits; hovering `Table` in the flamegraph says "the parent rendered"; `Table`'s `actualDuration` approximately equals its `baseDuration`; its one prop `rows` is flagged as unchanged.

**Think about:**
- What are the three render reasons the Profiler can report?
- What does `baseDuration` approximately equal `actualDuration` tell you?
- Why measure in a production build?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

**Diagnosis from the flamegraph alone:** the expensive commit is the one fired on each keystroke. The costly node is `Table`, and its reason is "the parent rendered," not "props changed" and not "hook changed." That plus `rows` being flagged unchanged tells you `Table` is a pure cascade victim: `Form`'s `query` state changes, `Form` re-runs, and the render recurses into `Table` even though nothing `Table` depends on moved. `actualDuration` approximately equals `baseDuration` on `Table` confirms nothing memoized away, the full 500-row subtree really rendered.

**The one-line fix:**

```tsx
const Table = React.memo(Table);
```

`rows` is stable across keystrokes, so `memo`'s shallow `Object.is` compare passes and React skips `Table` entirely on each keystroke commit. (Equivalent structural fix: lift the `<input>` and its `query` state into its own component so the volatile state no longer sits above `Table`.)

**WHY at the mechanism level:** the Profiler attributes each commit to exactly one of three reasons (props / hook-or-context / parent). "Parent rendered" means the shallow-compare gate does not exist yet, so React recurses in unconditionally. Adding `memo` installs that gate; with unchanged props the gate short-circuits the recursion. `baseDuration` is the no-memo baseline, so `actual` approximately `base` is the signature of "nothing bailed out here."

**How to spot it in review:** the inverse also matters. If you see `useMemo`/`React.memo` added in a diff with no attached Profiler trace or measured hot path, that is memoization by guesswork. It adds compare cost and cognitive load for a render that may never have been hot. Ask for the flamegraph before accepting the "optimization."

**Production symptom:** keystroke or scroll jank traced to a single fat commit that re-renders a large list on every input event.

**Common misconception corrected:** trusting dev-build timings. The dev build is slower and, under `StrictMode`, intentionally double-renders, so a dev flamegraph both inflates durations and can show phantom renders. Always re-check the hot path in a production build before committing to a fix.

**Self-check rubric:**
- [ ] I named the three render reasons (props changed, hook/context changed, parent rendered).
- [ ] I read the trigger off the flamegraph ("parent rendered", `rows` unchanged), not off the source.
- [ ] I explained what `actualDuration` approximately `baseDuration` means (nothing memoized away).
- [ ] I gave the one-line fix and why the shallow compare bails out.
- [ ] I flagged measuring in production (dev + StrictMode overstate cost).

#### Practice: real-world variant (save, then reveal)

**Prompt:** At a trading app, a `<Ticker>` updates a `price` via `setState` about 30 times a second. A Profiler recording shows a fat commit every ~33ms, and the expensive node is a `<Chart>` whose reason reads "props changed: `data`." But the underlying price series only appends one point per second; 29 of every 30 updates carry the same data. Diagnose why `data` is flagged as changed on nearly every commit, and give the fix plus how you would confirm it in the Profiler.

**Model answer (revealed on demand):**

The reason "props changed: `data`" combined with "the values are logically the same 29 out of 30 times" is the classic **referential instability** signature. The parent is almost certainly computing `data` inline each render:

```tsx
// inside Ticker, runs ~30x/sec
const data = points.map((p) => ({ x: p.t, y: p.price }));  // new array + new objects every render
return <Chart data={data} />;
```

Even when the contents are identical, `.map` returns a brand-new array with new object references every render. `Chart` is (or should be) `memo`ized, so its shallow compare runs `Object.is(prevData, nextData)`, which is `false` because the reference changed. The Profiler faithfully reports "props changed: `data`," but the change is identity, not value. That is why 29 harmless commits still re-render the chart.

**Fix: stabilize the reference so it only changes when the data actually changes.**

```tsx
const data = useMemo(
  () => points.map((p) => ({ x: p.t, y: p.price })),
  [points] // points is a new array only when a point is appended
);
return <Chart data={data} />; // Chart = React.memo(Chart)
```

Now `data` keeps the same reference across the 29 no-op price ticks (assuming `points` identity is itself stable between appends), so `memo`'s compare passes and `Chart` skips those commits, re-rendering only on the ~1/sec append. If `price` state is what re-runs `Ticker` but the chart does not need the sub-second price, the stronger fix is to not put that 30Hz value in state at all (drive the numeric readout via a ref) so `Ticker` stops committing 30 times a second.

**How to confirm in the Profiler:** re-record and hover `Chart`. Before, it renders on ~30 commits/sec with "props changed: data"; after, it renders on ~1 commit/sec and the intermediate commits show `Chart` bailing out (no bar, or "did not render"). Check on a **production build**, since StrictMode's double-render in dev would otherwise muddy the per-commit count.

**Production symptom:** steady CPU burn and chart jank that scales with tick frequency, not with actual data changes, the tell that you are re-rendering on reference churn rather than real updates.

> Module **8.2** (Memo Economics) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [8.1](./l8-diagnosing-renders.md) · Next: [8.3](./l8-composition-colocation.md)

# L8 · Memo Economics

Memoization is not free and it is not automatic magic. After this module you can catch the four bugs that make `React.memo`, `useMemo`, and `useCallback` cost real work while delivering nothing: a single inline prop that defeats a shallow compare, a hook whose identity churns because one transitive dependency is unstable, speculative memoization that is slower than the render it guards, and a React Compiler bailout that silently un-optimizes a component nobody re-measured. You will learn to price memoization instead of cargo-culting it.

### ajr-l8-memo-shallow-compare: React.memo shallow compare and what defeats it

- **id:** `ajr-l8-memo-shallow-compare`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** react, memo, performance

#### Learn

`React.memo` wraps a component and, before re-rendering it, runs a shallow comparison of the new props against the previous props. Shallow comparison means: same set of keys, and for every key `Object.is(prev[key], next[key])` returns `true`. If all keys pass, React skips the render and reuses the last output. If even one fails, React renders the component normally. There is no value comparison anywhere in this path, only reference identity.

That distinction is the whole lesson. A freshly constructed object, array, or function is never `Object.is`-equal to a previous one, even when the contents are identical:

```tsx
Object.is({ padding: 8 }, { padding: 8 }); // false, two distinct objects
Object.is([1, 2, 3], [1, 2, 3]);           // false, two distinct arrays
Object.is(() => {}, () => {});             // false, two distinct closures
```

Now look at what a parent hands down on every render:

```tsx
const Row = React.memo(function Row({ label, style, onClick }) {
  // real render work here
  return <div style={style} onClick={onClick}>{label}</div>;
});

function List({ rows }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(id);
  }, []);
  return rows.map((r) => (
    <Row
      key={r.id}
      label={r.label}                 // primitive, stable
      style={{ padding: 8 }}          // NEW object every render
      onClick={() => select(r.id)}    // NEW closure every render
    />
  ));
}
```

Every 500ms the timer re-renders `List`. `label` is a string and passes `Object.is`, but `style` and `onClick` are fresh literals, so the shallow compare fails on those two keys and every `Row` re-renders. The `memo` did its job perfectly: it ran the compare, found changed references, and correctly rendered. It just never got to bail out. You are paying for a comparison that always says "render anyway".

The critical rule is that it takes exactly **one** unstable prop to defeat the whole boundary. Stabilizing three of four props changes nothing if the fourth is still inline. Memoization is all-or-nothing at the prop-set level.

The fix maps one-to-one to the unstable prop kind. Hoist a static object to a module constant so it has one identity forever. Wrap a callback in `useCallback` so it survives across renders. Wrap a computed array or object in `useMemo` keyed on its true inputs.

```tsx
const ROW_STYLE = { padding: 8 }; // one reference, created once at module load

function List({ rows }) {
  const onClick = useCallback((id) => select(id), []);
  return rows.map((r) => (
    <Row key={r.id} label={r.label} style={ROW_STYLE} onClick={() => onClick(r.id)} />
  ));
}
```

Note that `children` counts too: `<Row><Icon /></Row>` passes a fresh element object as `props.children` every render, which is why wrapping a heavy child in `memo` often does nothing.

Interview nuance: memo is not free even when it works. It stores the previous props and runs an `Object.is` loop on every parent render. On a trivially cheap component that overhead can exceed the render it skips, which is the subject of lesson three.

Recap: `React.memo` shallow-compares props by reference with `Object.is`; a single inline object, array, function, or `children` element is a new reference each render and defeats the bail-out, so stabilize every non-primitive prop (or let the compiler do it).

#### See it live

**Demo (react-demo):** a memoized `<Row>` receiving four props (a primitive `label`, an object `style`, an array `tags`, a callback `onClick`), with the parent re-rendering on a 500ms timer and a render-count badge on the child.

Widget: a card for a single memoized `<Row>` with a large render-count badge that increments and flashes red for 400ms each time the child actually renders. A parent "tick" counter in the corner shows the timer firing every 500ms regardless. Below the row are four checkboxes labeled "stabilize style", "stabilize tags", "stabilize onClick", and one greyed-out "label (already primitive)". With every stabilize box unchecked, the badge flashes red and climbs in lockstep with the parent tick. The learner checks boxes one at a time; the badge keeps climbing until the LAST non-primitive prop is stabilized, at which point it goes dark and freezes while the parent tick keeps counting.

```tsx
const Row = React.memo(function Row({ label, style, tags, onClick }) {
  renderCountRef.current += 1; // badge reads this and flashes red
  return <div style={style} onClick={onClick}>{label} ({tags.length})</div>;
});

function Demo({ row }) {
  const [tick, setTick] = useState(0);
  const [sStyle, sTags, sCb] = useToggles();
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(id);
  }, []);

  const style = sStyle ? ROW_STYLE : { padding: 8 };
  const tags = sTags ? STABLE_TAGS : ["a", "b"];
  const onClick = sCb ? stableOnClick : () => select(row.id);

  return <Row label={row.label} style={style} tags={tags} onClick={onClick} />;
}
```

**Watch:** the badge stays red and the count rises on every parent tick as long as ANY of `style`, `tags`, or `onClick` is still an inline literal, which proves one unstable prop is enough to defeat `memo`. The instant the final unstable prop is stabilized, the badge goes dark and the count freezes even though the parent keeps ticking, proving the child now genuinely bails out. (Note: the toggles swap between a stable module constant and an inline literal for teaching clarity; real code stabilizes unconditionally rather than branching.)

#### Apply: think, then answer (save, then reveal)

**Prompt:** Find why `memo` does nothing and fix the unstable props: a memoized `<Row label={r.label} style={{}} onClick={() => open(r.id)} />` still re-renders on every parent render. Identify each prop that defeats the shallow compare and rewrite the parent so the child bails out, then say why each fix restores the bail-out.

**Think about:**
- What compare does `memo` perform?
- How many unstable props defeat it?
- When is `memo` net-negative?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

Two props defeat the compare: the inline `style={{}}` object and the inline `onClick={() => open(r.id)}` arrow. Both are new references on every parent render, so `React.memo`'s shallow compare finds a changed key and re-renders `Row`. The primitive `label` passes `Object.is` and is not the problem.

```tsx
const EMPTY_STYLE = {}; // hoisted: one reference forever

const Row = React.memo(function Row({ label, style, onClick }) {
  return <div style={style} onClick={onClick}>{label}</div>;
});

function Parent({ rows }) {
  const onOpen = useCallback((id) => open(id), []);
  return rows.map((r) => (
    <Row key={r.id} label={r.label} style={EMPTY_STYLE} onClick={() => onOpen(r.id)} />
  ));
}
```

Mechanism: `React.memo` stores the previous props and, on the next parent render, loops the keys and runs `Object.is(prev[k], next[k])`. A literal `{}` and a fresh arrow are constructed anew each render, so `Object.is` is `false` and React renders normally. Hoisting the empty object gives it a single stable identity; `useCallback` with an empty dep array returns the same function reference for the component's lifetime.

How to spot it in review: search the JSX call site for `React.memo` (or a memoized child) whose props include an inline `{...}`, `[...]`, `() => ...`, or JSX `children`. The memo wrapper and the inline prop are always a few lines apart. A grep for `style={{` or `onClick={()` at memo call sites finds most of these.

Production symptom: a component you deliberately memoized shows up in the React Profiler re-rendering on every commit with "Props changed: style, onClick" in its "Why did this render" tooltip. You added cost (the compare) and got no bail-out.

Common misconception: that `memo` compares prop values. It compares references with `Object.is`. Two identical-looking objects are never equal, so deep-looking equality is exactly what `memo` does not give you.

**Self-check rubric:**
- [ ] I identified both the inline object and the inline function as unstable, and left the primitive alone.
- [ ] My fix hoists static objects and wraps callbacks in `useCallback`, not `useMemo` on a function.
- [ ] I stated that one unstable prop defeats the entire boundary.
- [ ] I named `Object.is` reference comparison as the mechanism.
- [ ] I noted the Profiler "Props changed" signal as the review/production tell.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Scenario: a virtualized transactions table at a fintech dashboard renders 60 visible `<TxnRow>` rows, each `React.memo`-wrapped. On scroll and on a websocket price tick the parent re-renders and all 60 rows re-render, dropping frames. Each row receives `data={txn}`, `columns={[...]}` (built inline in the parent), `renderCell={(c) => ...}` (inline), and `className={isSelected ? "sel" : ""}`. Diagnose which props defeat memo across all 60 rows at once and give the fix that lets unchanged rows bail out during a price tick.

**Model answer (revealed on demand):**

The `columns` array and the `renderCell` function are constructed once in the parent but inline, so they get a new identity on every parent render and are passed identically-unstable to all 60 rows. That single pair of shared props defeats `memo` for the entire list simultaneously, which is why a one-row price change re-renders sixty rows.

```tsx
const COLUMNS = [{ key: "amount" }, { key: "merchant" }, { key: "date" }]; // module const

function TxnTable({ txns, selectedId }) {
  const renderCell = useCallback((col, txn) => formatCell(col, txn), []);
  return txns.map((t) => (
    <TxnRow
      key={t.id}
      data={t}                                   // stable per-row reference from the store
      columns={COLUMNS}
      renderCell={renderCell}
      className={t.id === selectedId ? "sel" : ""} // primitive, changes only for 2 rows
    />
  ));
}
```

Mechanism: because `columns` and `renderCell` are now referentially stable, a price tick that mutates one `txn` only changes `data` for that one row. The other 59 rows receive identical references on every prop and their `memo` shallow compare passes, so React skips them. `className` is a string, so `Object.is` handles selection changes correctly for the two affected rows without extra work.

How to spot it in review: shared props built in the parent's render body (an inline `columns={[...]}` or `renderCell={() => ...}`) are the highest-leverage memo defeat because they break every child at once. In review, any array or function literal passed to a `.map()` of memoized children is a red flag.

Production symptom: the Profiler flamegraph shows the full row list committing on every scroll or socket event, with per-row "columns, renderCell changed". Frame time spikes above 16ms and the table stutters during live updates. The fix is verified when the same tick commits only the changed rows.

The misconception to correct: hoisting per-row `data` would be wrong; `data` should change when a row's transaction changes. You stabilize the shared, unchanging props (`columns`, `renderCell`) and let the genuinely-changing prop drive the one render that must happen.

### ajr-l8-usecallback-usememo-stability: useCallback/useMemo and dep transitivity

- **id:** `ajr-l8-usecallback-usememo-stability`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** react, useCallback, performance

#### Learn

`useMemo(fn, deps)` and `useCallback(fn, deps)` cache a value (or a function) and only recompute it when the dependency array changes. "Changes" means React runs `Object.is` across each dep against the previous render's deps; if any dep differs, you get a cache miss and a fresh reference. This is the same reference comparison as `React.memo`, applied to the deps array instead of the props.

The consequence is transitivity: a memoized value is only as stable as its least-stable dependency. Wrapping something in `useCallback` does not make it stable. It makes it exactly as stable as the things you listed in the deps. If one dep is rebuilt every render, the hook is a cache miss every render and returns a new reference every render, so it is doing bookkeeping for nothing.

```tsx
function Toolbar({ data }) {
  // filter is rebuilt inline every render -> new object every render
  const filter = { q: "", active: true };

  // useCallback lists `filter` as a dep -> that dep changes every render
  const onSelect = useCallback((id) => applyFilter(filter, id), [filter]);

  return <List onSelect={onSelect} />; // onSelect identity churns -> memoized List still re-renders
}
```

`onSelect` looks stabilized. It is not. Because `filter` is a new object each render, `[filter]` fails the deps compare each render, `useCallback` misses its cache each render, and `onSelect` is a fresh function each render. A memoized `<List>` sees a changed `onSelect` and re-renders anyway. You added a hook and got zero stability.

The fix is to stabilize upstream, at the root of the chain, not to add another wrapper at the leaf:

```tsx
function Toolbar({ data }) {
  const filter = useMemo(() => ({ q: "", active: true }), []); // stable object
  const onSelect = useCallback((id) => applyFilter(filter, id), [filter]);
  return <List onSelect={onSelect} />; // now genuinely stable
}
```

Now `filter` has one identity, `[filter]` passes the deps compare, `useCallback` hits its cache, and `onSelect` is stable, so `<List>` bails out. The stability flowed down the chain because the source was fixed.

Interview nuance: these hooks are a performance hint, not a correctness guarantee. React is explicitly allowed to throw away a `useMemo` cache (for example under memory pressure) and recompute. You must never rely on `useMemo`/`useCallback` identity for correctness, only for avoiding wasted work. If your code breaks when a memo recomputes, the bug is the reliance, not the recompute.

Recap: `useMemo`/`useCallback` compare deps with `Object.is`; an unstable dep is a cache miss every render, so a hook is only as stable as its least-stable dependency, and the fix is to stabilize the upstream source rather than add another wrapper at the leaf.

#### See it live

**Demo (react-demo):** a memoized callback whose identity is shown as a hash badge next to a memoized child's render count, with a single toggle switching one dependency between "unstable (rebuilt inline)" and "stable (`useMemo`)".

Widget: at the top, a parent "render" counter and a toggle labeled "stabilize the `filter` dep". Below it, an "onSelect identity" hash badge (a short hex string derived from the function reference, for example `#a3f1`) and a child `<List>` render-count badge that flashes when the list renders. When the toggle is off, forcing a parent re-render (a "poke" button) changes the hash badge to a new value and flashes the list badge every time. When the learner flips the toggle on, poking the parent leaves the hash badge frozen at one value and the list badge stops flashing, even though the parent counter keeps climbing.

```tsx
// Two components so each calls its hooks unconditionally (Rules of Hooks).
function UnstableFilterDemo() {
  const filter = { q: "", active: true };                      // rebuilt every render
  const onSelect = useCallback((id) => applyFilter(filter, id), [filter]);
  return (
    <>
      <HashBadge of={onSelect} />
      <List onSelect={onSelect} /> {/* memoized; badge flashes because onSelect churns */}
    </>
  );
}

function StableFilterDemo() {
  const filter = useMemo(() => ({ q: "", active: true }), []); // one identity
  const onSelect = useCallback((id) => applyFilter(filter, id), [filter]);
  return (
    <>
      <HashBadge of={onSelect} />
      <List onSelect={onSelect} /> {/* memoized; onSelect stable, so it bails out */}
    </>
  );
}

function Demo() {
  const [poke, setPoke] = useState(0);
  const [stable, setStable] = useState(false);
  return (
    <>
      <button onClick={() => setPoke((p) => p + 1)}>poke parent</button>
      {stable ? <StableFilterDemo /> : <UnstableFilterDemo />}
    </>
  );
}
```

**Watch:** with the toggle off, every poke gives `onSelect` a new hash and flashes the `<List>` badge, proving the `useCallback` is missing its cache because its `filter` dep churns. With the toggle on, the hash freezes and the `<List>` badge stops flashing on poke, proving that stabilizing the upstream dep is what stabilizes the callback, not the `useCallback` wrapper itself. (Note: the two toggle states are separate components so each calls its hooks unconditionally; the unstable one rebuilds `filter` every render, the stable one memoizes it.)

#### Apply: think, then answer (save, then reveal)

**Prompt:** Stabilize an `onSelect` handler so a memoized `<List>` stops re-rendering. You are given `const filter = { active: true }` built inline in the parent and `const onSelect = useCallback((id) => run(filter, id), [filter])`. Trace why `onSelect`'s identity churns every render and fix it upstream, then say why wrapping harder at the leaf would not help.

**Think about:**
- What do these hooks cache on?
- Why does an unstable dep cause a cache miss?
- Are they a correctness guarantee?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

`onSelect` churns because its only dependency, `filter`, is a new object literal on every render. `useCallback` caches its function keyed on the deps array; when `Object.is(prevFilter, nextFilter)` is `false` every render, the cache misses every render and returns a fresh function. The memoized `<List>` sees a changed `onSelect` prop and re-renders. The `useCallback` is pure overhead here.

```tsx
function Parent() {
  const filter = useMemo(() => ({ active: true }), []); // fix the source
  const onSelect = useCallback((id) => run(filter, id), [filter]);
  return <List onSelect={onSelect} />;
}
```

Mechanism: memoization hooks compare their deps by reference. Once `filter` has a single stable identity (from a `useMemo` with an empty dep array, or a module constant, or state that only changes on real input), the `[filter]` compare passes, `useCallback` hits its cache, and `onSelect` keeps one identity across renders. Stability is transitive: you fix the root and it flows to every consumer.

How to spot it in review: read the deps array, not the wrapper. Any `useCallback`/`useMemo` whose deps array holds an object, array, or function that is constructed in the render body is a churning hook. The tell is a `[somethingObject]` dep where `somethingObject` is assigned a literal a few lines up.

Production symptom: a memoized subtree re-renders on every parent commit, and the Profiler shows the callback prop as "changed" even though you "memoized" it. Adding more `useCallback` wrappers downstream does nothing because the instability is inherited from the unstable source.

Common misconception: that wrapping the leaf harder helps, or that `useCallback` guarantees a stable reference. It only guarantees stability relative to its deps, and React may even drop a `useMemo` cache and recompute, so these hooks are a performance hint, never a correctness contract.

**Self-check rubric:**
- [ ] I traced the churn to the `filter` dep, not to `onSelect` itself.
- [ ] My fix stabilizes `filter` upstream (`useMemo`/const), not another wrapper on `onSelect`.
- [ ] I explained the `Object.is` deps compare and the per-render cache miss.
- [ ] I stated stability is transitive (least-stable dep wins).
- [ ] I noted these hooks are a hint, not a correctness guarantee.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Scenario: a maps product renders a memoized `<MarkerLayer>` fed by `useMemo(() => markers.filter(inViewport), [markers, viewport])`. Panning the map should reuse markers when the visible set is unchanged, but the layer recomputes and re-renders on every pointer-move event even when no marker enters or leaves. The `viewport` object is rebuilt (`{ zoom, center }`) on each pointer-move from the map library's callback. Diagnose the churn and make the memo actually cache across pans that do not change the marker set.

**Model answer (revealed on demand):**

`viewport` is a new `{ zoom, center }` object on every pointer-move, so the `[markers, viewport]` deps compare fails on every event and the `useMemo` recomputes and returns a new filtered array, re-rendering `<MarkerLayer>` continuously during a pan. The filter result is often identical (no marker crossed the edge), but `useMemo` compares deps by reference, not the output by value, so it cannot tell.

```tsx
// Depend on the primitive fields that actually affect the result, not the object identity.
const markersInView = useMemo(
  () => markers.filter((m) => inViewport(m, zoom, center.lat, center.lng)),
  [markers, zoom, center.lat, center.lng]
);
```

Mechanism: by listing the primitive `zoom`, `center.lat`, and `center.lng` instead of the freshly-built `viewport` object, the deps compare passes whenever those numbers are unchanged, so the memo holds its cached array and `<MarkerLayer>` bails out. If the library gives you numbers that jitter in the least significant digits, quantize them (round to the tile precision you actually render at) before using them as deps so tiny pans do not invalidate the cache.

How to spot it in review: an object rebuilt by a third-party callback and then dropped whole into a deps array. The object is stable in meaning but unstable in identity, which is invisible unless you read where it comes from. The rule is to depend on the primitive inputs that change the result, not on a wrapper object.

Production symptom: continuous re-renders during interaction (pan, drag, resize), a Profiler flamegraph that never goes idle while the pointer moves, and battery or fan spin on the client. Frame time stays pinned even when the visible data has not changed.

The misconception to correct: that `useMemo` skips work when the output is unchanged. It skips work only when the deps references are unchanged. Feed it stable primitive deps (or memoize the source `viewport` object upstream) and the output-level stability follows.

### ajr-l8-when-memo-hurts: When memoization hurts (the cost model)

- **id:** `ajr-l8-when-memo-hurts`  ·  **difficulty:** hard  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** react, memo, performance

#### Learn

Every memoization has a bill, and it comes due whether or not you get the discount. `React.memo` stores the previous props and, on each parent render, runs an `Object.is` loop over every prop key. `useMemo`/`useCallback` store a value plus its deps array and run a compare over the deps every render, and they hold that value in memory for the component's lifetime. The payoff is a single skipped render. So the trade is: on every render you pay `compare + retained memory`, and sometimes you save `one render of the child`.

That trade only wins when the child render you skip is more expensive than the compare you always pay. For a trivially cheap component (an icon, a label, a three-item list), the compare can cost as much as or more than just rendering the thing. You added `memo` and made it slower.

```tsx
// A) plain: React renders three cheap <li>s. Cost = 3 tiny renders.
function Tag({ text }) {
  return <li>{text}</li>;
}

// B) memoized: React stores prev props, runs Object.is per prop, THEN maybe renders.
const Tag = React.memo(function Tag({ text }) {
  return <li>{text}</li>;
});
```

Under rapid parent re-renders where `text` actually changes, variant B does strictly more work than A: it pays the compare, the compare fails (text changed), and it renders anyway, exactly like A but with the compare tax added. Even when `text` is stable, the compare on a one-property render is not obviously cheaper than rendering a single `<li>`. Memoizing trivial leaves is a net loss surprisingly often.

`useMemo` over cheap arithmetic is the same trap:

```tsx
// Slower: the closure, deps array, and Object.is compare cost more than the addition.
const total = useMemo(() => a + b, [a, b]);

// Faster: just compute it.
const total = a + b;
```

The memoize heuristic that actually holds up: memoize when the guarded work is expensive **or** when the memoized value feeds another memo boundary (a stable prop that lets a heavy child bail out). Concretely, reach for `memo`/`useMemo` when (1) the subtree is wide or the computation is measurably heavy (a big sort, filter, or layout), or (2) the value is a prop passed into an already-memoized child and stabilizing it is what unlocks that child's bail-out. Everything else is speculative and should be deleted until a Profiler measurement says otherwise.

Interview nuance: "memoize everything" is an anti-pattern precisely because the cost is paid on every render and the benefit is conditional. The senior move is to memoize the measured hot path and leave cheap components plain, then verify with the Profiler that the memo boundary actually bails out.

Recap: `memo`/`useMemo` cost a compare plus retained memory on every render and only pay off by skipping an expensive render; memoizing trivially-cheap components or cheap arithmetic is net-negative, so memoize expensive or wide subtrees and props that feed other memo boundaries, not everything.

#### See it live

**Demo (react-demo):** two identical three-item lists side by side, one fully memoized (each item wrapped in `React.memo`, plus a `useMemo` over the array) and one plain, both driven by the same rapid re-render timer, with a cumulative render-time counter under each.

Widget: two panels labeled "Memoized" and "Plain", each showing three tiny rows and a cumulative-milliseconds counter that sums the time spent in that panel's renders. A shared "re-render rate" slider drives both panels from one timer so the comparison is fair, and each render mutates the item text so the compares fail (the realistic churning case). A running "delta" readout shows Memoized-minus-Plain time. As the rate climbs, the Memoized counter ticks up FASTER than Plain, and the delta stays positive and grows.

```tsx
const rows = ["alpha", "beta", "gamma"];

const MemoTag = React.memo(function MemoTag({ text }) { return <li>{text}</li>; });
function PlainTag({ text }) { return <li>{text}</li>; }

// Two panels so each calls its hooks unconditionally (Rules of Hooks).
function MemoizedPanel({ tick }) {
  const items = useMemo(() => rows.map((r) => r + tick), [tick]); // recomputes anyway: tick changes
  const t0 = performance.now();
  const ui = <ul>{items.map((x, i) => <MemoTag key={i} text={x} />)}</ul>;
  accumulate(true, performance.now() - t0); // counter reads this
  return ui;
}

function PlainPanel({ tick }) {
  const items = rows.map((r) => r + tick);
  const t0 = performance.now();
  const ui = <ul>{items.map((x, i) => <PlainTag key={i} text={x} />)}</ul>;
  accumulate(false, performance.now() - t0); // counter reads this
  return ui;
}

function Panel({ memoized, tick }) {
  return memoized ? <MemoizedPanel tick={tick} /> : <PlainPanel tick={tick} />;
}
```

**Watch:** the memoized panel's cumulative-time counter climbs FASTER than the plain panel's under the same re-render rate, and the delta readout stays positive. This proves that for trivially-cheap children, the `Object.is` compare and `useMemo` bookkeeping cost more than simply rendering three `<li>`s, so speculative memoization made the component slower. (Note: `performance.now()` timing in a sandbox is noisy and the absolute numbers vary run to run; the demo shows the direction of the effect, not a benchmark-grade measurement, and the effect is exaggerated by forcing the compares to fail every render.)

#### Apply: think, then answer (save, then reveal)

**Prompt:** Decide which of four things should keep its memoization and which should lose it, with a one-line justification each: (1) a `React.memo`-wrapped `<Icon size={16} />` leaf, (2) `const count = useMemo(() => arr.length, [arr])`, (3) `const sorted = useMemo(() => bigArray.slice().sort(cmp), [bigArray])` feeding a memoized `<Table>`, (4) a `React.memo`-wrapped `<Avatar>` that receives an inline `style={{}}` from its parent.

**Think about:**
- What is the cost of `memo` per render?
- When is `useMemo` over cheap arithmetic slower?
- What is the memoize heuristic?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

Keep memoization on (3) only. Remove it from (1), (2), and (4).

```tsx
// (1) DELETE memo: an <Icon> is trivially cheap; the shallow compare costs more than rendering it.
function Icon({ size }) { return <svg width={size} height={size} /* ... */ />; }

// (2) DELETE useMemo: arr.length is O(1); the closure + deps compare cost more than the read.
const count = arr.length;

// (3) KEEP useMemo: a real sort over a big array is expensive, AND it feeds a memoized <Table>.
const sorted = useMemo(() => bigArray.slice().sort(cmp), [bigArray]);

// (4) memo is USELESS here (delete or fix the caller): the inline style={{}} defeats the compare
//     every render, so <Avatar> never bails out. Either drop memo, or stabilize the style prop.
```

Mechanism: `React.memo` and `useMemo` each pay a per-render `Object.is` comparison plus retained memory, and the only payoff is skipping an expensive render. In (1) the render is a single SVG, cheaper than the compare, so memo is net-negative. In (2) reading `.length` is O(1), far cheaper than allocating a closure and a deps array and comparing them, so the `useMemo` is slower than the bare expression. In (3) the `.sort()` over a large array is genuinely expensive and the memoized `<Table>` downstream only bails out if `sorted` is stable, so this hits both halves of the heuristic (expensive work, and a value feeding another memo boundary). In (4) the memo is defeated by the inline object prop and pays the compare while never bailing, so it is pure overhead until the caller stabilizes `style`.

How to spot it in review: a `memo`/`useMemo` with no measured hot path behind it. Ask "what expensive render or which downstream memo boundary does this unlock?" If the answer is "none", delete it. A `useMemo` wrapping arithmetic or a `.length`/property read is almost always slower than the expression.

Production symptom: slightly slower renders across the board from speculative memoization, plus higher memory retention, and a Profiler that shows memo boundaries that never actually skip. The regression is diffuse, which is why it survives review.

Common misconception: "memoize everything for performance". Memoization is a conditional discount paid for with an unconditional tax. Memoize the measured expensive path and props that feed other memo boundaries; leave cheap leaves plain.

**Self-check rubric:**
- [ ] I kept memoization only on the expensive sort that feeds a memo boundary.
- [ ] I removed `useMemo` from the O(1) `.length` read and justified it by cost.
- [ ] I removed `memo` from the trivially-cheap `<Icon>`.
- [ ] I flagged the `<Avatar>` memo as defeated by the inline `style` (overhead, not a win).
- [ ] Each justification names cost-vs-benefit, not a generic "for performance".

#### Practice: real-world variant (save, then reveal)

**Prompt:** Scenario: a code-review tool's file-diff page was "hardened for performance" by a previous engineer who wrapped every component in `React.memo` and every derived value in `useMemo`, including per-line `<DiffLine>` (a single `<div>` with a class), `useMemo(() => lines.length, [lines])`, and `useMemo(() => tokenize(hunk), [hunk])` where `tokenize` is a heavy syntax-highlight pass feeding a memoized `<Hunk>`. The page got slower after the change on large diffs. Explain why blanket memoization regressed it and give the targeted memo strategy.

**Model answer (revealed on demand):**

Blanket memoization regressed the page because the overwhelming majority of components on a large diff are trivially cheap per-line `<div>`s, and wrapping thousands of them in `React.memo` adds thousands of `Object.is` compares and retained prop snapshots on every scroll or re-render. The aggregate compare tax on the cheap leaves dwarfs the one genuinely expensive computation the memoization was supposed to protect.

```tsx
// DELETE: per-line memo, thousands of cheap compares > thousands of cheap renders.
function DiffLine({ text, kind }) { return <div className={kind}>{text}</div>; }

// DELETE: O(1) read, the useMemo is slower than the expression.
const lineCount = lines.length;

// KEEP: tokenize is a heavy pass AND feeds a memoized <Hunk>; this is the real hot path.
const tokens = useMemo(() => tokenize(hunk), [hunk]);
```

Mechanism: memoization is a per-render tax (compare plus memory) that only pays off by skipping an expensive render. At the scale of a large diff, the tax scales with the number of cheap leaves while the benefit is concentrated in a handful of expensive `tokenize` calls. Removing memo from the leaves eliminates thousands of compares; keeping it on `tokenize` protects the one computation that is actually costly and lets the memoized `<Hunk>` bail out.

How to spot it in review: a diff that adds `React.memo`/`useMemo` uniformly to a whole file rather than to a measured hot path. The tell is memo on a component whose entire body is one cheap element, and `useMemo` over property reads. Ask for the Profiler trace that motivated each one.

Production symptom: the "optimized" build is slower than the naive one, worst on large inputs, with a Profiler showing a sea of memoized components that mostly re-render anyway (their props change) plus elevated memory. The regression grows with input size, which is the fingerprint of a per-item tax.

The misconception to correct: that adding memo everywhere is a safe default. It is a cost multiplier on cheap components. The correct strategy is to virtualize the long list, memoize only the expensive `tokenize`/`<Hunk>` boundary, and leave the per-line elements plain, then verify with the Profiler that the expensive boundary bails out and the leaves are cheap.

### ajr-l8-react-compiler-auto-memo: React Compiler auto-memoization and its bailouts

- **id:** `ajr-l8-react-compiler-auto-memo`  ·  **difficulty:** hard  ·  **est:** 14 min  ·  **demo:** react-demo  ·  **skills:** react19, compiler, performance

#### Learn

The React Compiler (React 19+) is a build-time transform (a Babel plugin) that reads your components, statically analyzes their data flow, and injects fine-grained memoization automatically. Where you used to hand-write `useMemo`/`useCallback`/`React.memo`, the compiler figures out which values depend on which inputs and caches each one at the exact granularity it needs, so a rules-compliant component gets memoized without you writing a single hook.

The catch is that it only does this for code that follows the Rules of React: components and hooks must be pure, must not mutate their props, state, or values created during render, and must not do things the compiler cannot statically reason about. When it hits a pattern it cannot prove safe, it does not error and it does not partially optimize the risky part. It **bails out** on that component and leaves it exactly as you wrote it, unmemoized. The bail-out is silent. Your build succeeds, the component works, and it simply does not get the auto-memoization the rest of your app got.

```tsx
// Compiler CAN memoize this: pure, no mutation, derived values only.
function Clean({ items, query }) {
  const filtered = items.filter((i) => i.name.includes(query));
  return <List items={filtered} />; // auto-memoized, no manual hooks needed
}

// Compiler BAILS on this: it mutates a value during render.
function Mutating({ items }) {
  const config = getConfig();
  config.sorted = true;              // mutation in render -> not provably pure
  items.push({ id: "sentinel" });    // mutating a prop -> bail out
  return <List items={items} />;     // left untouched, no auto-memoization
}
```

Other common bail-out triggers include `try/catch` around the reactive parts of a component in some compiler versions, calling hooks conditionally, reading a ref during render in unsupported ways, and generally anything the analyzer cannot prove is pure. The fix is not to add manual memo on top. It is to make the component compiler-safe: do not mutate props or render-created values, keep render pure, and move side effects into effects or event handlers. Then the compiler can memoize it.

The most important operational fact: the compiler runs at **build time**. There is no runtime on/off switch in the shipped bundle. The output is already-transformed code with the memoization baked in (or, for a bailed component, baked out). You cannot toggle it per render, and you cannot tell at runtime whether a given component was optimized without checking the compiled output, the React DevTools "Memo ✨" badge, or the ESLint plugin's warnings at build time.

Interview nuance: the compiler is not a substitute for architecture. It reduces re-renders from referential churn, but it does not fix an over-fetching effect, a bad context split, or a genuinely expensive computation. And it does not remove all re-renders: a component still re-renders when its own state or a real (value-changed) input changes. Treat it as automating the mechanical `useMemo`/`useCallback` layer, not as making performance thinking obsolete.

Recap: the React Compiler auto-memoizes rules-compliant components at build time by static analysis, but silently bails on impure patterns (mutation in render, mutating props, unsupported constructs) and leaves them unmemoized, so the fix is to follow the Rules of React rather than to blindly delete manual memo, and there is no runtime toggle because the transform already ran during the build.

#### See it live

**Demo (react-demo):** a compiler "ON/OFF" toggle over two components (a clean pure one and one that mutates a value in render), each with a render-count badge, so the learner can see the clean one benefit and the mutating one not.

Widget: two component cards side by side, "Clean" and "Mutating", each with a render-count badge, sitting under a parent that re-renders on a "poke" button when an unrelated piece of parent state changes. A big "Compiler: ON / OFF" toggle sits at the top. With the toggle OFF, poking the parent re-renders both cards (both badges climb). With the toggle ON, poking the parent leaves the "Clean" card frozen (its badge stops) while the "Mutating" card keeps climbing, illustrating the silent bail-out on the mutating variant.

```tsx
// The demo hand-wires what the compiler WOULD do, because the compiler cannot be toggled at runtime.
// "compiler ON" is approximated by a variant that memoizes; "OFF" by one that does not.
// Two components so each calls its hooks unconditionally (Rules of Hooks).
function CleanCompiled({ items, query }) {
  const filtered = useMemo(() => items.filter((i) => i.name.includes(query)), [items, query]);
  renderCountRef.clean += 1;
  return <List items={filtered} />;
}

function CleanPlain({ items, query }) {
  const filtered = items.filter((i) => i.name.includes(query));
  renderCountRef.clean += 1;
  return <List items={filtered} />;
}

function CleanCard({ items, query, compilerOn }) {
  return compilerOn
    ? <CleanCompiled items={items} query={query} />
    : <CleanPlain items={items} query={query} />;
}

function MutatingCard({ items, compilerOn }) {
  // Even with compilerOn true, we do NOT memoize: mutation is a bail-out, so it never benefits.
  const copy = items;
  copy.dirty = true;                 // mutation in render -> compiler would bail
  renderCountRef.mutating += 1;
  return <List items={copy} />;
}
```

**Watch:** with the toggle ON, the "Clean" card's render badge freezes on parent pokes while the "Mutating" card's badge keeps climbing, which proves that the compiler optimizes only rules-compliant code and silently leaves the mutating variant unoptimized. Important honesty note: the React Compiler is a build-time Babel transform, so it cannot actually be toggled at runtime. This toggle is a hand-wired `useMemo` approximation of what the compiler does automatically, not the compiler running live. The real compiler emits already-memoized code at build time; the shipped bundle has no on/off switch, and the bail-out you are seeing simulated is what would happen in the compiled output for the mutating component.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Explain the bailout and make it compiler-safe: a component was fast with hand-written `useMemo`/`useCallback` and got slow after someone deleted them "because the compiler handles it now", but this one component regressed while the rest of the app stayed fast. The suspect code mutates a value during render (or wraps the reactive body in `try/catch`). Diagnose why the compiler bailed on exactly this component and rewrite it so the compiler can memoize it.

**Think about:**
- What does the compiler assume?
- What patterns make it bail silently?
- What does it NOT fix?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The compiler bailed on this component because it violates the Rules of React: it mutates a value during render (or hides the reactive body inside `try/catch`), so the analyzer cannot prove the render is pure and refuses to inject memoization. Deleting the manual `useMemo`/`useCallback` removed the only memoization this component had, and the compiler did not replace it, so it regressed while compliant components elsewhere kept their auto-memoization.

```tsx
// Before: mutates a render-created value, so the compiler bails and leaves it unmemoized.
function Panel({ rows }) {
  const view = buildView(rows);
  view.expanded = true;          // mutation in render -> bail out
  return <Grid view={view} />;
}

// After: pure render, no mutation. The compiler can now memoize buildView + the <Grid> props.
function Panel({ rows }) {
  const view = useMemo(() => ({ ...buildView(rows), expanded: true }), [rows]);
  // ^ or just: const view = { ...buildView(rows), expanded: true };
  //   under the compiler, no manual hook is needed once the mutation is gone.
  return <Grid view={view} />;
}
```

Mechanism: the compiler statically traces which outputs depend on which inputs and emits fine-grained memoization for pure data flow. A mutation of a prop or a render-created value breaks that analysis because the value's identity and contents are no longer a pure function of the inputs, so the compiler conservatively bails on the whole component and leaves your source untouched. Producing a new object (spread) instead of mutating makes the render pure and re-enables optimization.

How to spot it in review: after a compiler adoption PR that deletes manual memo, look for components that still mutate in render (`x.foo =`, `arr.push(...)` on props or derived values) or wrap reactive logic in `try/catch`. Verify each formerly-memoized component with the React DevTools "Memo ✨" badge and the compiler's ESLint plugin, which flags bail-outs at build time. Do not delete manual memo blindly; confirm the compiler actually took over.

Production symptom: a surprise perf regression isolated to one or a few components after adopting the compiler, while the rest of the app is fine. The Profiler shows that component re-rendering on every parent commit as if it had no memoization, because it has none.

Common misconception: that the compiler removes all re-renders and fixes architecture. It only automates the referential-stability layer for rules-compliant code. It does not fix mutation-in-render (it bails), does not eliminate state-driven re-renders, and does not repair over-fetching or bad context boundaries.

**Self-check rubric:**
- [ ] I named the specific bail-out cause (mutation in render / mutating a prop / try-catch), not "it broke".
- [ ] My fix makes render pure (spread/new object) instead of adding manual memo on top.
- [ ] I said the compiler runs at build time with no runtime toggle.
- [ ] I named a concrete verification (DevTools "Memo" badge or the compiler ESLint plugin).
- [ ] I stated what the compiler does NOT fix (state re-renders, architecture, over-fetching).

#### Practice: real-world variant (save, then reveal)

**Prompt:** Scenario: a design-system team ships a component library that adopted the React Compiler and mandated "remove all manual memo, the compiler handles it". A downstream product reports that one heavily-used `<DataTable>` from the library regressed badly on large datasets after the upgrade, while every other library component improved. The `<DataTable>` sorts its rows in place (`rows.sort(cmp)` on the incoming prop) and wraps its cell-render loop in a `try/catch` for defensive error handling. Diagnose why this one component was left un-memoized and make it compiler-safe without losing the defensive behavior.

**Model answer (revealed on demand):**

Two Rules-of-React violations make the compiler bail on `<DataTable>` specifically: it sorts the incoming `rows` prop in place (mutating a prop during render), and it wraps the reactive cell-render body in `try/catch`, which some compiler versions cannot analyze and treat as a bail-out. Because the compiler bailed and the team deleted all manual memo, this component alone shipped with no memoization, so it re-renders and re-sorts the whole dataset on every parent commit, which is catastrophic on large data.

```tsx
function DataTable({ rows, cmp }) {
  // FIX 1: sort a copy, never mutate the prop.
  const sorted = [...rows].sort(cmp);

  // FIX 2: move defensive handling out of the reactive render path.
  const cells = sorted.map((r) => renderCellSafe(r)); // try/catch lives inside a plain helper
  return <tbody>{cells.map((c, i) => <tr key={i}>{c}</tr>)}</tbody>;
}

// Defensive behavior preserved, but outside the compiler-analyzed render body.
function renderCellSafe(row) {
  try { return <Cell {...row} />; }
  catch { return <Cell error />; }
}
```

Mechanism: replacing `rows.sort(cmp)` with `[...rows].sort(cmp)` makes the render pure (no prop mutation), and pulling the `try/catch` into a plain helper keeps the reactive component body analyzable. With both fixed, the compiler can statically trace the data flow, memoize the sort against `[rows, cmp]`, and stabilize the props into the row subtree, so unchanged commits skip the re-sort and re-render.

How to spot it in review: on a "delete all manual memo" migration, audit exactly the components that mutate props or wrap render in `try/catch`, and check each against the compiler's ESLint plugin and the DevTools "Memo ✨" badge. A single un-badged component in an otherwise-optimized library is the fingerprint of a silent bail-out.

Production symptom: one library component regresses sharply on large inputs after the compiler upgrade while everything else improves, with a Profiler showing full re-sorts and re-renders on every commit. The regression is isolated and scales with data size, pointing straight at a per-component bail-out rather than a global config problem.

The misconception to correct: "the compiler handles it" is only true for rules-compliant components. The mandate should have been "remove manual memo AND make every component compiler-safe, verified by the lint and the Memo badge", because the compiler silently opts out of code it cannot prove pure and never warns you at runtime.

> Module **5.2** (Referential Equality & memo) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [5.1](./l5-render-triggers.md) · Next: [5.3](./l5-state-batching.md)

# L5 · Referential Equality & memo

React decides whether to skip work by comparing references with `Object.is`, not by comparing values. After this module you can catch the three bugs that quietly make memoization do nothing: a `React.memo` defeated by an inline object, array, or function prop; a `useCallback`/`useMemo` whose identity churns because one of its deps is unstable; and a Context Provider whose fresh value object re-renders every consumer in the tree. All three look correct in review and all three show up as jank the moment the component gets expensive.

### ajr-l5-memo-defeated-inline-props: Referential equality defeats React.memo

- **id:** `ajr-l5-memo-defeated-inline-props`  ·  **difficulty:** medium  ·  **est:** 14 min  ·  **demo:** react-demo  ·  **skills:** react, memo, referential-equality

#### Learn

`React.memo` wraps a component and skips its re-render when the incoming props are shallow-equal to the previous props. "Shallow-equal" means: same set of keys, and for each key `Object.is(prevProp, nextProp) === true`. That is a reference check, not a value check. Two objects that look identical are not equal:

```tsx
Object.is({ padding: 8 }, { padding: 8 }); // false
Object.is([1, 2], [1, 2]);                 // false
Object.is(() => {}, () => {});             // false
```

Now watch what a normal parent does on every render:

```tsx
const ExpensiveList = React.memo(function ExpensiveList({ items, onSelect, style }) {
  // heavy render work
});

function Page({ data }) {
  const [query, setQuery] = useState("");
  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <ExpensiveList
        items={data.filter((d) => d.name.includes(query))} // new array every render
        onSelect={(id) => open(id)}                          // new function every render
        style={{ padding: 8 }}                               // new object every render
      />
    </>
  );
}
```

Every keystroke re-renders `Page`. On each render the `.filter(...)` produces a brand new array, the arrow function is a new closure, and the `{ padding: 8 }` literal is a new object. `React.memo` runs its shallow compare, finds three props whose references changed, and re-renders `ExpensiveList` anyway. The `memo` you added is doing real work on every keystroke and then deciding not to skip. You paid for the comparison and got nothing.

The critical detail: it only takes **one** unstable prop to defeat `memo`. If you stabilize two of the three and leave the array inline, the shallow compare still fails on that array and the child still re-renders. Memoization is all-or-nothing at the prop-set level.

The fixes map one-to-one to the unstable prop types. Wrap the function in `useCallback` so its identity survives across renders. Wrap the computed array in `useMemo` keyed on its real inputs. Hoist the static style object to a module constant (it never changes, so it never needs to live in the component at all).

```tsx
const LIST_STYLE = { padding: 8 }; // module constant, one stable reference forever

function Page({ data }) {
  const [query, setQuery] = useState("");
  const items = useMemo(
    () => data.filter((d) => d.name.includes(query)),
    [data, query]
  );
  const onSelect = useCallback((id) => open(id), []);
  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <ExpensiveList items={items} onSelect={onSelect} style={LIST_STYLE} />
    </>
  );
}
```

Interview nuance: the React Compiler (React 19+) auto-memoizes these props at build time, which makes the manual `useCallback`/`useMemo` unnecessary in compiled code. But the compiler is opt-in per project, and it still cannot memoize an inline `{ padding: 8 }` that changes meaning based on props unless it can prove stability. Knowing why the reference changes is what lets you trust or distrust the compiler.

Recap: `React.memo` shallow-compares props by reference with `Object.is`; a single inline object, array, or function literal is a new reference each render and defeats it, so stabilize every unstable prop (or let the compiler do it).

#### See it live

**Demo (react-demo):** a `React.memo`-wrapped `ExpensiveList` receiving `style={{padding:8}}`, an inline `onSelect`, and a freshly `.filter()`-ed array, with a live render-count badge on the child, sitting under a parent text input.

Widget: a text input labeled "filter" at the top, and below it a child card showing a render-count badge (a number that increments and flashes red for 400ms each time the child actually renders). Three toggle switches let the learner independently stabilize each prop: "stable style", "stable onSelect", "stable items". With all three off, every keystroke flashes the badge red and bumps the count. As the learner flips switches on, the count keeps rising on keystroke until the LAST switch is flipped, at which point the badge goes dark and the count freezes even as they keep typing.

```tsx
const ExpensiveList = React.memo(function ExpensiveList({ items, onSelect, style }) {
  renderCountRef.current += 1;      // badge reads this and flashes red
  return <ul style={style}>{items.map((i) => <li key={i.id} onClick={() => onSelect(i.id)}>{i.name}</li>)}</ul>;
});

function Demo({ data }) {
  const [query, setQuery] = useState("");
  const [stableStyle, stableCb, stableItems] = useToggles();

  // Hooks are called unconditionally; the toggles only pick which reference to pass.
  const stableSelect = useCallback((id) => open(id), []);
  const stableItemsMemo = useMemo(() => data.filter((d) => d.name.includes(query)), [data, query]);

  const style = stableStyle ? LIST_STYLE : { padding: 8 };
  const onSelect = stableCb ? stableSelect : (id) => open(id);
  const items = stableItems ? stableItemsMemo : data.filter((d) => d.name.includes(query));

  return (<><input value={query} onChange={(e) => setQuery(e.target.value)} />
    <ExpensiveList items={items} onSelect={onSelect} style={style} /></>);
}
```

**Watch:** the badge lights red and the count climbs on every keystroke as long as ANY of the three props is still inline, proving that one unstable prop is enough to defeat `memo`. Only when the final unstable prop is stabilized does the badge go dark and the count stop, proving the child now genuinely skips its render. (Note: `useCallback` and `useMemo` are called unconditionally every render; each toggle only chooses whether to pass the stabilized reference or a fresh inline one, which is exactly how you stabilize in real code.)

#### Apply: think, then answer (save, then reveal)

**Prompt:** Identify the three unstable props and rewrite the parent so the child stops re-rendering, then say why each fix works (a `<ExpensiveList items={data} onSelect={()=>...} style={{padding:8}} />` sitting under `React.memo` still re-renders on every keystroke in the parent).

**Think about:**
- What compare does `memo` do?
- How many unstable props does it take to defeat `memo`?
- What are `useCallback`/`useMemo` actually for here?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The three unstable props are the inline function `onSelect={()=>...}`, the inline object `style={{padding:8}}`, and, if `items` is computed inline (for example `data.filter(...)`), the array. Each is a new reference on every parent render.

```tsx
const LIST_STYLE = { padding: 8 };

function Parent({ data }) {
  const [query, setQuery] = useState("");
  const items = useMemo(() => data.filter((d) => d.name.includes(query)), [data, query]);
  const onSelect = useCallback((id) => open(id), []);
  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <ExpensiveList items={items} onSelect={onSelect} style={LIST_STYLE} />
    </>
  );
}
```

Mechanism: `React.memo` compares props with a shallow `Object.is` check per key. `{}` is never `Object.is`-equal to another `{}`, and the same holds for array literals and function expressions, because each evaluation allocates a new reference. On every keystroke the parent re-renders, re-evaluates those literals, and hands `memo` three references that differ from last time, so the shallow compare returns false and the child renders. `useCallback` and `useMemo` exist precisely to hand back the SAME reference across renders (as long as their deps are unchanged), and a module constant is the strongest form of stability because it is allocated once for the module's lifetime.

How to spot it in review: any inline object, array, or function literal passed as a prop to a component you wrapped in `React.memo`. The literal syntax (`{`, `[`, `=>`) at a prop site is the tell.

Production symptom: a `memo` that "does nothing." An engineer adds `React.memo` to fix jank, the profiler still shows the expensive subtree re-rendering on every keystroke, and the fix appears not to work. It is working; the compare just always fails.

Common misconception: that `React.memo` deep-compares props. It does not. It does a shallow, reference-level compare, so two structurally identical objects are treated as different. (You can pass a custom comparator as the second argument, but a deep compare there is usually more expensive than the render you are trying to skip.)

**Self-check rubric:**
- [ ] Named all three unstable props (function, object, array).
- [ ] Applied `useCallback`, `useMemo`, and a hoisted constant to the right props.
- [ ] Stated that `memo` uses shallow `Object.is`, not deep, comparison.
- [ ] Explained that one unstable prop is enough to defeat `memo`.
- [ ] Named the symptom: a `memo` that appears to do nothing.

#### Practice: real-world variant (save, then reveal)

**Prompt:** "Virtualized data grid, 5,000 rows." Your team wraps each `<Row>` in `React.memo`, yet scrolling and cell edits still drop frames. Each row receives `row={rows[i]}`, `columns={columns}`, `onEdit={(id, v) => dispatch(edit(id, v))}`, and `renderers={{ date: fmtDate, money: fmtMoney }}`. Diagnose which props defeat `memo` at 5,000 rows and rewrite the parent so only edited rows re-render. Say why the scale makes this worse than a single list.

**Model answer (revealed on demand):**

Two props are unstable. `onEdit` is a new closure each parent render, and `renderers={{...}}` is a fresh object literal each render. `row` and `columns` are stable if they come from a memoized selector, but if `columns` is rebuilt inline it is a third offender. At 5,000 rows the cost is multiplicative: every unstable prop forces 5,000 shallow compares to fail and 5,000 rows to re-render on a single cell edit, which is exactly the work `memo` was supposed to prevent.

```tsx
const RENDERERS = { date: fmtDate, money: fmtMoney }; // module constant

function Grid({ rows, columns }) {
  const onEdit = useCallback((id, v) => dispatch(edit(id, v)), [dispatch]);
  const stableColumns = useMemo(() => columns, [columns]);
  return rows.map((row) => (
    <Row key={row.id} row={row} columns={stableColumns} onEdit={onEdit} renderers={RENDERERS} />
  ));
}
```

Mechanism: with `onEdit` and `renderers` stabilized, a single-cell edit changes exactly one `row` reference (the edited one), so only that row's shallow compare fails and only that row re-renders. The other 4,999 rows get the same references and `memo` skips them.

How to spot it in review: object or function literals passed into a list-rendered `memo` child. The `.map(row => <Row ... />)` pattern amplifies any single mistake by the row count.

Production symptom: scroll jank and multi-hundred-millisecond edit latency on large grids, with a React Profiler flame chart showing every row committing on one keystroke. The fix drops committed rows from N to 1. Misconception to correct: passing a stable `columns` array is not enough if `onEdit` is still inline; `memo` needs EVERY prop stable, so the least-stable prop sets the ceiling.

### ajr-l5-usecallback-usememo-identity: useCallback/useMemo preserve identity (and their dep trap)

- **id:** `ajr-l5-usecallback-usememo-identity`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** react, useCallback, identity

#### Learn

`useCallback` and `useMemo` exist to hand a component the SAME reference across renders. `useCallback(fn, deps)` returns the previous `fn` as long as `deps` are unchanged; `useMemo(factory, deps)` returns the previous computed value as long as `deps` are unchanged. "Unchanged" is decided by an `Object.is` comparison of each entry in the dependency array against the previous render's entry. That word "each entry" is where the trap lives.

A stable hook is only as stable as its least-stable dependency. Consider:

```tsx
function Toolbar({ query }) {
  const filter = { term: query, caseSensitive: false }; // new object every render
  const onSearch = useCallback(() => runSearch(filter), [filter]); // dep is unstable
  return <SearchButton onClick={onSearch} />; // SearchButton is React.memo
}
```

The intent is that `onSearch` is stable so the memoized `SearchButton` skips re-rendering. But `filter` is an object literal rebuilt on every render, so `Object.is(prevFilter, nextFilter)` is always false. `useCallback` sees a changed dep, treats it as a cache miss, and returns a brand new function. `onSearch`'s identity churns every render, `SearchButton`'s prop changes, and the memo is defeated. Wrapping the callback did nothing because the dependency underneath it was never stable.

The fix is to stabilize the dependency, not to add another layer of wrapping. Depend on the primitive values, or memoize the object one level up so it, too, has a stable reference:

```tsx
function Toolbar({ query }) {
  const onSearch = useCallback(
    () => runSearch({ term: query, caseSensitive: false }),
    [query] // primitive dep: stable unless the string actually changes
  );
  return <SearchButton onClick={onSearch} />;
}
```

Now the dep is a string. `Object.is("abc", "abc")` is true, so as long as `query` does not change, `useCallback` returns the same function and `SearchButton` skips. Depending on primitives (strings, numbers, booleans) is the reliable move because primitives compare by value under `Object.is`. When you truly need an object dep, memoize that object with its own `useMemo` keyed on primitives, building a stability chain from the leaves up.

Interview nuance: `useMemo` and `useCallback` are performance hints, not correctness guarantees. React reserves the right to throw away the cache (for example under memory pressure, or across some future behaviors) and recompute. So you must never rely on a memoized value's identity for correctness, for instance keying an effect off it to run "only once." If your logic breaks when the cache is dropped and the value is recreated, the bug is in your assumption, not in React. Use these hooks to make correct code faster, never to make incorrect code work.

Recap: `useCallback`/`useMemo` cache by `Object.is` on their deps, so an unstable dependency is a cache miss every render; fix identity churn by stabilizing the dep (prefer primitives), and never treat the returned identity as a guarantee.

#### See it live

**Demo (react-demo):** a `React.memo` child whose received callback identity is displayed as a short hash badge (derived from the function reference), with a switch that flips the `useCallback` dependency between an unstable inline object and a stable primitive, under a parent input that forces re-renders.

Widget: a text input at the top (typing forces parent re-renders). Below it, a child card shows two things: a "callback hash" badge (a stable short id computed once per unique function reference, so it changes only when the function reference changes) and a render-count badge that flashes when the child renders. A toggle labeled "stable dep" switches the `useCallback` dependency from `[filter]` (an inline object) to `[query]` (a primitive). With the toggle off, every keystroke changes the hash and flashes the child. With it on, the hash freezes and the child stops flashing.

```tsx
const SearchButton = React.memo(function SearchButton({ onClick }) {
  renderCountRef.current += 1;
  return <button onClick={onClick}>Search (cb #{hashOf(onClick)})</button>;
});

function Demo() {
  const [query, setQuery] = useState("");
  const [stableDep, setStableDep] = useState(false);
  const filter = { term: query, caseSensitive: false }; // unstable each render

  // useCallback is called once; the toggle only swaps its body and dep array.
  const onSearch = useCallback(
    () => runSearch(stableDep ? { term: query } : filter),
    stableDep ? [query] : [filter], // primitive dep vs object dep (always a miss)
  );

  return (<><input value={query} onChange={(e) => setQuery(e.target.value)} />
    <SearchButton onClick={onSearch} /></>);
}
```

**Watch:** with "stable dep" off, the callback hash changes on every keystroke and the child flashes, proving that the object dependency makes `useCallback` return a new function each render even though the wrapping never changed. Flip "stable dep" on and the hash freezes: same reference every render, child stops flashing. This proves the hook is only as stable as its least-stable dep. (The hook is called unconditionally; the toggle only swaps its dep array between a primitive and an object, which is what makes identity churn or hold.)

#### Apply: think, then answer (save, then reveal)

**Prompt:** Trace why the callback identity still changes on every render even though it is wrapped, then fix the upstream dependency and explain the fix (given `useCallback(fn, [filter])` where `filter` is an inline object rebuilt each render).

**Think about:**
- What do these hooks compare deps with?
- Why is a stable hook only as stable as its least-stable dep?
- Can you rely on them for correctness?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The callback identity changes because `filter` is a new object on every render, and `useCallback` compares its dependency array with `Object.is`. `Object.is(prevFilter, nextFilter)` is false whenever `filter` is a fresh literal, so `useCallback` records a cache miss and returns a new function each render. Wrapping the function did not help, because the wrapping only preserves identity when the deps are stable, and the dep is the unstable thing.

```tsx
// Fix: depend on the primitives the filter is built from.
const onSearch = useCallback(
  () => runSearch({ term, caseSensitive }),
  [term, caseSensitive]
);

// Or, if you need the object elsewhere, stabilize it one level up:
const filter = useMemo(() => ({ term, caseSensitive }), [term, caseSensitive]);
const onSearch = useCallback(() => runSearch(filter), [filter]);
```

Mechanism: `useCallback(fn, deps)` and `useMemo(factory, deps)` both cache by running `Object.is` on each dependency against the previous render's value. Primitives compare by value, so `[term, caseSensitive]` is stable across renders that do not change those values. Objects and arrays compare by reference, so an inline `[filter]` is a guaranteed miss. Stabilizing the object with its own `useMemo` (keyed on primitives) turns the reference stable and the chain holds.

How to spot it in review: a `useCallback` or `useMemo` whose dependency array contains an object, array, or function that is constructed during render. Look at where each dep comes from, not just at the hook call.

Production symptom: memoization that "silently does nothing." The team added `useCallback` and `React.memo`, the profiler still shows churn, and no one can see why because the callback LOOKS stabilized. The identity is churning one level down.

Common misconception: that `useMemo`/`useCallback` guarantee a stable reference. They are caches React may drop and recompute. Never rely on the identity for correctness (do not use it as an effect's "run once" key); rely on it only as a performance optimization.

**Self-check rubric:**
- [ ] Stated that deps are compared with `Object.is`.
- [ ] Explained the inline object dep is a cache miss every render.
- [ ] Fixed by depending on primitives (or memoizing the object upstream).
- [ ] Noted a hook is only as stable as its least-stable dep.
- [ ] Said memoization is not a correctness guarantee (cache can be dropped).

#### Practice: real-world variant (save, then reveal)

**Prompt:** "Data-table filters with a custom hook." A shared `useTableController(options)` returns `{ rows, onSort, onFilter }`, and every consumer's `onSort` identity changes on every render, defeating the memoized `<HeaderCell>`s. Inside the hook, `onSort = useCallback(sortFn, [options])` and `options` is the object literal each screen passes as `useTableController({ pageSize: 25, sticky: true })`. Fix the identity churn at the hook boundary and explain why the fix belongs at the call site, not inside the hook.

**Model answer (revealed on demand):**

The churn originates at the call site: `useTableController({ pageSize: 25, sticky: true })` allocates a new `options` object on every render of the screen. Inside the hook, `useCallback(sortFn, [options])` sees a new `options` reference each render and returns a new `onSort` each render, so every memoized `<HeaderCell>` re-renders. The hook cannot fix this alone, because it receives a fresh object no matter what it does internally.

```tsx
// Call site: stabilize the options object.
const options = useMemo(() => ({ pageSize: 25, sticky: true }), []);
const { rows, onSort, onFilter } = useTableController(options);

// Or make the hook depend on primitives instead of the object:
function useTableController({ pageSize, sticky }) {
  const onSort = useCallback(sortFn, [pageSize, sticky]); // primitive deps
  // ...
}
```

Mechanism: the second form is the more robust API design, because it moves the stability boundary inside the hook and depends on primitives (`pageSize`, `sticky`) that compare by value under `Object.is`. Then no caller can accidentally destabilize `onSort` by passing an inline object, since the hook never keys off the object identity at all.

How to spot it in review: a custom hook that takes an object argument and lists that whole object in an internal dependency array. That couples every consumer's memoization to whether the consumer remembered to memoize the argument.

Production symptom: a shared table or list component where "memoized" header cells or rows re-render on unrelated state changes across many screens at once, because the shared hook leaks identity churn to all of them. Fixing the hook to destructure primitives fixes every consumer in one place. Misconception to correct: that the fix should go inside the callback (wrapping harder). The instability is in the dependency, so the fix has to move up to where the dependency is created.

### ajr-l5-context-value-identity: Context value identity re-renders every consumer

- **id:** `ajr-l5-context-value-identity`  ·  **difficulty:** hard  ·  **est:** 14 min  ·  **demo:** react-demo  ·  **skills:** react, context, identity

#### Learn

A Context consumer re-renders whenever the Provider's `value` changes by `Object.is`. It does not matter which field the consumer reads. Context has no per-field subscription: consuming the context subscribes you to the ENTIRE value's identity. So the identity of the value object is the whole ballgame.

Here is the common mistake:

```tsx
function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState("light");
  return (
    <UserContext.Provider value={{ user, setUser }}>  {/* new object every render */}
      {children}
    </UserContext.Provider>
  );
}
```

Every time `AppProvider` re-renders, for any reason, the `{ user, setUser }` literal allocates a new object. `Object.is(prevValue, nextValue)` is false, so React re-renders every consumer of `UserContext`, including a deep `<Avatar>` that only reads `user.name` and does not care that some unrelated `theme` state changed. One keystroke in an unrelated input can flash an entire app subtree.

The first fix is to stabilize the value with `useMemo`, keyed on the actual values it wraps:

```tsx
const value = useMemo(() => ({ user, setUser }), [user]); // setUser is already stable
return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
```

Now the value's identity only changes when `user` changes, so unrelated re-renders of `AppProvider` no longer churn consumers. (`setUser` from `useState` is guaranteed stable, so it does not belong in the dep array's stability calculus, though including it is harmless.)

The second, stronger fix is to split the context. State that changes often and the setters that never change have different update frequencies, and cramming them into one value forces consumers of the stable half to re-render with the volatile half:

```tsx
<UserStateContext.Provider value={user}>
  <UserDispatchContext.Provider value={setUser}>
    {children}
  </UserDispatchContext.Provider>
</UserStateContext.Provider>
```

A component that only dispatches (`setUser`) subscribes to `UserDispatchContext`, whose value is a stable function, so it NEVER re-renders from context. Components that read `user` subscribe to `UserStateContext` and re-render only when `user` actually changes. This is the pattern behind many state libraries.

Interview nuance: `React.memo` does NOT protect a component from a context change. `memo` compares props; a consumed context is not a prop. If a component calls `useContext(Ctx)` and `Ctx`'s value identity changes, that component re-renders even if all its props are identical and it is wrapped in `memo`. This surprises people who expect `memo` to be a re-render firewall. It is a props firewall only. The way to stop context-driven re-renders is to stabilize or split the context value, not to wrap consumers in `memo`.

Recap: consumers re-render on the Provider value's `Object.is` identity regardless of which field they read, so `useMemo` the value or split state and dispatch into separate contexts; and remember `memo` cannot block a re-render caused by a consumed context change.

#### See it live

**Demo (react-demo):** a tree of consumer cards, each with its own render badge, under a single Provider whose `value` is an inline object; an unrelated text input at the top drives Provider re-renders, and a switch toggles between the inline value and a `useMemo`/split-context version.

Widget: at the top, a text input bound to an unrelated `theme` string (typing does not touch `user`). Below it, three consumer cards: `<Avatar>` reads `user.name`, `<Greeting>` reads `user.name`, and `<LogoutButton>` reads only `setUser`. Each card has a render-count badge that flashes when it renders. A toggle labeled "stable value" switches the Provider between `value={{ user, setUser }}` (inline) and a memoized/split version. With the toggle off, typing in the unrelated theme field flashes ALL three badges. With it on, typing in theme flashes none of them, and only changing `user` flashes the two cards that read `user`.

```tsx
const UserContext = React.createContext(null);

function Provider({ children, stable }) {
  const [user, setUser] = useState({ name: "Ada" });
  const [theme, setTheme] = useState("light"); // unrelated volatile state

  // useMemo is called unconditionally; the toggle picks memoized vs a fresh object.
  const memoizedValue = useMemo(() => ({ user, setUser }), [user]); // identity changes only with user
  const value = stable ? memoizedValue : { user, setUser };          // fresh object every render when off

  return (<>
    <input value={theme} onChange={(e) => setTheme(e.target.value)} />
    <UserContext.Provider value={value}>{children}</UserContext.Provider>
  </>);
}

function LogoutButton() {
  const { setUser } = useContext(UserContext); // reads only the setter
  renderCountRef.LogoutButton += 1;            // still re-renders when value identity churns
  return <button onClick={() => setUser(null)}>Log out</button>;
}
```

**Watch:** with "stable value" off, typing in the unrelated theme field flashes every consumer badge, including `<LogoutButton>` which only uses the setter, proving that consumers subscribe to the whole value's identity and not to individual fields. Flip "stable value" on and typing in theme flashes nothing; only a real `user` change flashes the two cards that read `user`. This proves that stabilizing (or splitting) the value scopes re-renders to genuine changes. (`useMemo` is called unconditionally; the toggle only picks whether to hand consumers the memoized value or a fresh object, which is what scopes or churns their re-renders.)

#### Apply: think, then answer (save, then reveal)

**Prompt:** Rewrite the Provider to memoize the value and/or split the context so only affected consumers re-render, and explain the reference-identity mechanism behind it (given `<Ctx.Provider value={{user,setUser}}>` where every consumer re-renders whenever the Provider re-renders for unrelated reasons).

**Think about:**
- Do consumers re-render based on which field they read?
- What are the two fixes?
- Does `React.memo` protect against a context change?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

Consumers do NOT re-render based on which field they read. Consuming a context subscribes a component to the whole `value` object's identity, and the inline `{ user, setUser }` is a fresh object on every Provider render, so `Object.is` is always false and all consumers re-render together.

```tsx
// Fix A: memoize the value.
const value = useMemo(() => ({ user, setUser }), [user]);
return <Ctx.Provider value={value}>{children}</Ctx.Provider>;

// Fix B: split state and dispatch into two contexts.
<UserStateContext.Provider value={user}>
  <UserDispatchContext.Provider value={setUser}>
    {children}
  </UserDispatchContext.Provider>
</UserStateContext.Provider>
```

Mechanism: React compares the previous and next Provider `value` with `Object.is`. If the reference differs, every subscribed consumer is scheduled to re-render, regardless of the fields it actually reads, because context subscription is at the value level, not the field level. `useMemo` pins the value's reference so it changes only when `user` changes. Splitting goes further: dispatch-only consumers subscribe to a context whose value is a stable function and so never re-render from context at all, while state readers re-render only on real state changes.

How to spot it in review: `<Provider value={{...}}>` with an object (or array) literal inline. That single literal couples every consumer to every Provider render.

Production symptom: one unrelated field change (a theme toggle, a sidebar open) re-renders an entire app subtree, producing input lag and dropped frames that profile as "the whole tree commits on every keystroke."

Common misconception: that wrapping consumers in `React.memo` stops these re-renders. It does not. `memo` only short-circuits on prop equality; a consumed context change bypasses `memo` entirely. The only fixes are stabilizing the value or splitting the context.

**Self-check rubric:**
- [ ] Stated consumers subscribe to the whole value identity, not per field.
- [ ] Gave both fixes: `useMemo` the value and/or split state/dispatch contexts.
- [ ] Explained the `Object.is` value-identity comparison.
- [ ] Named the symptom: unrelated change re-renders an entire subtree.
- [ ] Noted `React.memo` does not block context-driven re-renders.

#### Practice: real-world variant (save, then reveal)

**Prompt:** "Global app store in one Context." A single `<AppContext.Provider value={{ user, cart, theme, notifications, setUser, addToCart, ... }}>` wraps the whole app. Adding one item to the cart re-renders the header, the sidebar, the settings panel, and a 200-node product grid, tanking Interaction to Next Paint. Redesign the context layering so a cart change re-renders only cart consumers, and explain why one big memoized value is still not enough.

**Model answer (revealed on demand):**

One big `useMemo`'d value is not enough, because the value's identity legitimately changes whenever ANY slice changes. Adding to the cart changes `cart`, which changes the memoized value's reference, which re-renders every consumer of that single context, including the product grid that only reads `theme`. Memoizing controls unrelated PARENT re-renders, but it cannot separate consumers that care about different slices when they all share one value.

The fix is to split by update frequency and concern, so each consumer subscribes only to the slice it reads:

```tsx
<ThemeContext.Provider value={theme}>            {/* rarely changes */}
  <UserContext.Provider value={userValue}>       {/* changes on login */}
    <CartContext.Provider value={cartValue}>      {/* changes often */}
      <DispatchContext.Provider value={actions}>  {/* stable, memoized once */}
        {children}
      </DispatchContext.Provider>
    </CartContext.Provider>
  </UserContext.Provider>
</ThemeContext.Provider>
```

Mechanism: now a `cart` change flips only `CartContext`'s value identity, so only cart consumers re-render. The 200-node grid reading `theme` subscribes to `ThemeContext`, whose identity did not change, so React skips it. The `actions` object (all the setters, which are stable) lives in its own memoized context so pure dispatchers never re-render. How to spot it in review: a single "god context" holding many unrelated slices plus setters. Production symptom: high INP where a small action re-renders hundreds of unrelated nodes; the Profiler shows the whole tree committing. Fixing it drops committed nodes from hundreds to a handful. Misconception to correct: that a bigger `useMemo` or wrapping consumers in `memo` solves it. The real lever is context granularity: match each context's scope to a distinct update frequency, and keep stable setters in their own context.

> Module **4.1** (Mutation React Misses) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [3.4](./l3-optimistic-tearing.md) · Next: [4.2](./l4-copy-semantics.md)

# L4 · Mutation React Misses

React does not diff your data, it compares references. After this module you can catch the whole family of bugs where the data genuinely changed but the screen did not: an in-place `push` that never re-renders, a child mutating props and corrupting its parent, a functional updater that returns the same object, and a `Set` toggle that mutates in place. They all pass the happy-path smoke test and all fail the same way, silently, in review.

### ajr-l4-mutation-object-is-bailout: Mutation is invisible to React (the Object.is bail-out)

- **id:** `ajr-l4-mutation-object-is-bailout`  ·  **difficulty:** medium  ·  **est:** 14 min  ·  **demo:** react-demo  ·  **skills:** immutability, react, object-is

#### Learn

When you call `setState`, React does not walk your object to see what changed. It runs a single cheap check: `Object.is(previousStateValue, nextStateValue)`. If that returns `true`, React bails out of the update, skips the component, and skips its children. No re-render happens at all. This one comparison is the foundation of every bug in this module.

Now look at the most common way people add to a list:

```tsx
const [todos, setTodos] = useState<string[]>([]);

const add = (t: string) => {
  todos.push(t);     // mutates the existing array in place
  setTodos(todos);   // passes the SAME array reference back
};
```

`Array.prototype.push` changes the array's contents and returns the new length. It does not create a new array. So `todos` after the push is the exact same object it was before, same reference in memory, just with one more element. When you call `setTodos(todos)`, React compares `Object.is(oldTodos, todos)`. They are literally the same array, so the check is `true`, and React bails out. The data changed, the reference did not, and React only watches the reference.

The fix is to produce a brand new top-level reference:

```tsx
const add = (t: string) => setTodos([...todos, t]);
```

`[...todos, t]` allocates a new array. Now `Object.is(oldTodos, newArray)` is `false`, so React commits the update and re-renders with the new list.

The reason this bug is so nasty is that it is intermittent. Your mutated array is often still correct in memory. So the *next* time anything else re-renders that component (a parent updates, a different piece of state changes, StrictMode double-invokes in dev), React reads the current `todos` and the missing items suddenly appear all at once. In development under StrictMode the extra invocation can mask the bug entirely, which is why "it worked on my machine" is a recurring theme here.

**Interview nuance:** the precise answer is not "React needs immutability because it is functional." It is "React's bail-out is an `Object.is` reference check on the state value, so an in-place mutation is invisible to it." If you can name `Object.is` specifically (not `===`, though they agree here) you have signaled you understand the mechanism, not the slogan.

**Interview nuance:** the React Compiler does not rescue you. It memoizes based on identity too, so a stable-but-mutated reference makes it *more* aggressive about skipping work, not less. Compilation cannot detect that you secretly changed the contents behind a reference it was told is stable.

Recap: `setState` bails out when `Object.is(prev, next)` is true, in-place mutators like `push` keep the same reference, so always hand React a fresh top-level object or array.

#### See it live

**Demo (react-demo):** two todo lists side by side, "Add (mutate)" using `push` then `setTodos(todos)` versus "Add (copy)" using `setTodos([...todos, t])`, each with a render-count badge and a raw-length overlay read straight from the array.

The widget renders two `TodoList` cards. Each has a text input, an "Add" button, a **renders: N** badge that increments inside the component body on every commit, and a small debug overlay reading **array length: N** taken directly from the underlying array (not from rendered `<li>`s). The left card's `add` mutates: `todos.push(t); setTodos(todos)`. The right card's `add` copies: `setTodos([...todos, t])`. Type a word and click Add several times on each.

```tsx
function TodoList({ mode }: { mode: "mutate" | "copy" }) {
  const [todos, setTodos] = useState<string[]>([]);
  const renders = useRef(0);
  renders.current += 1;

  const add = (t: string) => {
    if (mode === "mutate") {
      todos.push(t);       // same reference
      setTodos(todos);     // Object.is(prev, next) === true -> bail-out
    } else {
      setTodos([...todos, t]); // new reference -> commit
    }
  };

  return (
    <div>
      <span>renders: {renders.current}</span>
      <span>array length: {todos.length}</span>
      <ul>{todos.map((t, i) => <li key={i}>{t}</li>)}</ul>
    </div>
  );
}
```

**Watch:** on the mutate card the **renders** badge stays frozen and no new `<li>` appears, yet the **array length** overlay climbs 1, 2, 3 with each click because the underlying array really is growing, React just never re-rendered to show it. On the copy card the badge ticks and the list grows in lockstep. The gap between the moving length probe and the frozen list is the `Object.is` bail-out made visible. (The length overlay only updates when *some other* commit happens to re-read the array, so if it looks stuck, click the copy card once and watch the mutate list snap to its true length: proof the data was there all along.)

#### Apply: think, then answer (save, then reveal)

**Prompt:** Fix `const add = t => { todos.push(t); setTodos(todos) }` so a new todo appears on screen, and explain why pushing and then setting the same array is a no-op to React.

**Think about:**
- What does React compare prev and next state with?
- Did the data actually change?
- Why does the length overlay move while the UI does not?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The corrected handler:

```tsx
const add = (t: string) => setTodos((prev) => [...prev, t]);
```

Using the functional updater form (`prev => ...`) is the extra-credit version: it reads the latest state even if several adds are batched, and `[...prev, t]` allocates a fresh array.

Why the original is a no-op: `todos.push(t)` mutates the array in place and returns the new length, it does not create a new array. So the variable `todos` still points at the identical object it did before. `setTodos(todos)` hands React that same reference. React's update path runs `Object.is(previous, next)`, sees the two are the same object, treats the state as unchanged, and bails out before scheduling any render. The array's contents changed, but React only ever compares the top-level reference, so from its point of view nothing happened.

How to spot it in review: scan for a mutating method (`.push`, `.pop`, `.splice`, `.sort`, `.reverse`, or `obj.prop =`) applied to a state value, immediately followed by a `setState` call passing that same variable. That pairing is almost always this bug. The tell is that the argument to `setState` is the same identifier that was just mutated.

Production symptom: the UI silently shows stale data. Because the mutated array is often correct in memory, the missing items appear later when an unrelated re-render flushes them, so the bug reads as "flaky" or "sometimes the list is behind by one." QA cannot reproduce it reliably, which is exactly why it survives to production.

Common misconception to correct: "the React Compiler will fix in-place mutation for me." It will not, and it makes things worse. The compiler memoizes on reference identity, so a stable-but-secretly-mutated reference tells it to skip even more work. Immutability is a contract the compiler relies on, not one it repairs.

**Self-check rubric:**
- [ ] I named `Object.is` as the specific comparison React uses.
- [ ] I stated that `push` returns a length and keeps the same reference.
- [ ] My fix allocates a new array (spread or `concat`), not a mutation.
- [ ] I explained why the length probe can move while the list stays frozen.
- [ ] I noted the bug is intermittent and flushes on the next unrelated render.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Debug the "Kanban board where cards never move." Your board state is `columns: { [colId: string]: Card[] }`. The drag handler does `columns[toCol].push(card); columns[fromCol].splice(index, 1); setColumns(columns)`. After a drop, nothing visibly moves until the user resizes the window. Explain every reason this fails and give a correct handler.

**Model answer (revealed on demand):**

There are two layers of the same bug. First, `setColumns(columns)` passes the same top-level object reference, so `Object.is(prev, columns)` is true and React bails out, exactly like the todo case. Second, even the nested arrays are mutated in place, so any memoized `Column` component comparing `prev.cards === next.cards` would also bail because those array references are unchanged too. The window-resize "fix" is a red herring: the resize triggers an unrelated re-render that finally reads the already-mutated state, so the cards jump to their correct places all at once. That is the intermittent flush, not a real update.

Correct handler, immutable at every level you touched:

```tsx
setColumns((prev) => {
  const card = prev[fromCol][index];
  return {
    ...prev,                                        // new top-level object
    [fromCol]: prev[fromCol].filter((_, i) => i !== index), // new source array
    [toCol]: [...prev[toCol], card],                // new target array
  };
});
```

You only clone along the path that changed (the top object plus the two affected column arrays); untouched columns keep their references, which is what lets memoized `Column`s that did not change correctly skip re-rendering.

How to spot it in review: nested mutation is harder to see than a bare `push`, so look for any assignment or mutator whose target is reached by indexing into state (`state[x].push(...)`, `state.a.b = ...`). The rule is that every object on the path from the root to the changed value must be replaced, not mutated.

Production symptom: drag-and-drop that "doesn't stick," selections that reset on the next interaction, and the classic bug report "it fixes itself if I resize or click somewhere else." All three are the reference bail-out reaching one level deeper.

**Self-check rubric:**
- [ ] I identified both the top-level and the nested reference reuse.
- [ ] My fix clones only the changed path and keeps untouched references stable.
- [ ] I explained the window-resize "fix" as an unrelated flush, not a real update.
- [ ] I connected the nested case to memoized child bail-out.

### ajr-l4-props-mutation: Mutating props corrupts the parent and breaks memo

- **id:** `ajr-l4-props-mutation`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** immutability, props, memo

#### Learn

Props feel read-only, but JavaScript does not enforce that. A prop is just a variable holding a reference, and if that reference points at an object the parent owns, then mutating through the prop mutates the parent's own state object. React does not freeze props (except a dev-only warning on a few internals), so `props.items.push(x)` is fully legal JS and fully destructive.

Consider a child that adds an item "locally" to be efficient:

```tsx
function AddPanel({ items }: { items: string[] }) {
  const addLocal = (x: string) => {
    items.push(x);   // mutating the parent's array through the prop
    forceRerender(); // or some local state bump to repaint this child
  };
  // ...
}
```

`items` here is the very same array the parent stored in `useState`. Pushing to it changes the parent's state object behind the parent's back, without ever calling the parent's setter. Two bad things now happen at once.

First, the parent's state is corrupted. Its array now has an element it never sanctioned, and it has no idea, because no setter ran. The parent's own render still reads the same reference, so on its next render (for any reason) the mystery item appears, looking like a ghost write.

Second, memoized siblings go stale in the opposite direction. Say a sibling is `React.memo(ItemCount)` receiving the same `items` prop. `React.memo` skips re-rendering when its props are shallow-equal to last time. Since you mutated `items` in place, its reference never changed, so `memo` correctly concludes "same props, skip." The sibling keeps showing the old count. So you get a UI that disagrees with itself: the parent list (or the mutating child) shows the new item, and the memoized sibling shows the old total. One was moved by mutation, the other was frozen by memo, and both are reading the same array.

The correct data flow is one-directional. The child does not own the data, so it must not change it. It requests a change through a callback prop, and the parent, the single owner, replaces its state immutably:

```tsx
function AddPanel({ items, onAdd }: { items: string[]; onAdd: (x: string) => void }) {
  const addLocal = (x: string) => onAdd(x);
}

// parent:
const [items, setItems] = useState<string[]>([]);
<AddPanel items={items} onAdd={(x) => setItems((prev) => [...prev, x])} />
```

Now the parent's setter runs, a new array reference is created, `memo` sees changed props on every affected child, and every subscriber stays consistent.

**Interview nuance:** "it works" is the trap answer. Mutating props often *appears* to work in the mutating component precisely because that component repaints itself, which hides the two failures that happen elsewhere: silent parent corruption and stale memoized siblings. Data down, events up, is not a style preference here, it is what keeps React's reference-based reconciliation coherent across the tree.

Recap: props are the parent's objects by reference, mutating them corrupts the owner silently and leaves `memo`'d siblings frozen, so lift every change to a callback and let the owner replace state immutably.

#### See it live

**Demo (react-demo):** a parent holding `items`, a memoized `AddPanel` child that does `props.items.push(newItem)` to "add locally," and a memoized `ItemCount` sibling, each with its own render badge.

The widget shows one `Parent` rendering two children: an `AddPanel` with an "Add via push" button and a `React.memo`-wrapped `ItemCount` displaying `items.length`. Every component has a **renders: N** badge. `AddPanel` also keeps a tiny local counter it bumps to force *itself* to repaint after the push, so you can see its own view update while the others do not. Click "Add via push" a few times, then click a separate "Parent re-render" button.

```tsx
const ItemCount = React.memo(function ItemCount({ items }: { items: string[] }) {
  return <span>count: {items.length}</span>; // memo skips when items ref is unchanged
});

function AddPanel({ items }: { items: string[] }) {
  const [, bump] = useReducer((n) => n + 1, 0);
  return (
    <button onClick={() => { items.push("item"); bump(); }}>Add via push</button>
  );
}
```

**Watch:** clicking "Add via push" repaints `AddPanel` (its local `bump` runs) so its own list length grows, but the memoized `ItemCount` badge stays frozen and keeps showing the old count, because the `items` reference never changed and `memo` bailed. The parent's badge also does not move, yet its state array is now silently longer. Click "Parent re-render" and both the parent and `ItemCount` suddenly jump to the mutated length: the ghost writes were sitting in the parent's state the whole time. The divergence between the mutated child and the frozen memoized sibling is the bug.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Show the parent silently changing and the memoized sibling going stale when a child does `props.items.push(newItem)` to add locally, then lift the change to a callback prop and explain why that restores consistency.

**Think about:**
- Why does mutating props reach the parent?
- Why does the memoized sibling not update?
- What is the correct data flow?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The corrected shape lifts ownership to the parent and passes a callback down:

```tsx
// child
function AddPanel({ onAdd }: { onAdd: (x: string) => void }) {
  return <button onClick={() => onAdd("item")}>Add</button>;
}

// parent (sole owner of the data)
const [items, setItems] = useState<string[]>([]);
<AddPanel onAdd={(x) => setItems((prev) => [...prev, x])} />
<ItemCount items={items} />
```

Why mutating props reaches the parent: a prop is a reference, and `items` in the child is the same array object the parent holds in state. `push` mutates that shared object in place, so the parent's state is now different even though its setter never ran and it never scheduled a render. The parent is corrupted silently.

Why the memoized sibling does not update: `React.memo` re-renders only when a shallow prop comparison detects a change. Because the mutation kept the same array reference, `Object.is(prevItems, nextItems)` is true, `memo` decides the props are unchanged, and it skips the render. The sibling keeps rendering the stale count. So one part of the tree advanced by mutation and another stayed frozen by memo, both looking at the same array.

Why the callback fixes it: the parent's `setItems((prev) => [...prev, x])` produces a brand new array reference. Now every child receiving `items` sees a changed prop, `memo` re-renders them, and the single owner is the only writer, so the tree stays consistent. This is unidirectional flow: data down as props, changes up as events.

How to spot it in review: any mutator (`.push`, `.splice`, `obj.x =`) whose target traces back to `props`. If the thing being mutated arrived as a prop, it belongs to a parent and must not be written to.

Production symptom: a visibly self-contradicting UI, a list and its counter disagreeing, a detail pane out of sync with the row it describes, and parent state that seems to change with no corresponding action in the logs.

Misconception to correct: "mutating props is fine because it works locally." It only works in the component doing the mutation, which repaints itself; the silent parent corruption and the frozen memoized siblings are the real, remote failures.

**Self-check rubric:**
- [ ] I explained that a prop is a shared reference the parent owns.
- [ ] I named `React.memo`'s shallow comparison as why the sibling stays frozen.
- [ ] My fix moves ownership to the parent and passes a callback down.
- [ ] I noted the parent's state is corrupted with no setter call.
- [ ] I rejected "it works locally" and named the remote failures.

#### Practice: real-world variant (save, then reveal)

**Prompt:** In a data-grid library, a memoized `<Row row={row} />` sorts its own cells for display with `row.cells.sort(byColumn)`. Users report that after sorting one row, unrelated rows render in the wrong order and a virtualized off-screen row shows stale data when scrolled into view. Explain the mechanism and fix it without giving up memoization.

**Model answer (revealed on demand):**

`Array.prototype.sort` sorts in place and returns the same array. `row.cells` is a reference into the parent grid's row model, so sorting it mutates the shared source data, not a display-only copy. Every other view of that same `cells` array (another memoized row reading the same model, a virtualized row that re-mounts on scroll and re-reads the model) now sees the reordered cells. Because the reference never changed, memoized rows that should re-render do not, and rows that happen to re-mount pick up the mutated order, producing the "unrelated rows are wrong" and "stale off-screen row" reports. It is props mutation plus in-place `sort`, compounded by virtualization re-reading the source.

Fix: never mutate the incoming prop, derive a sorted copy for display only, and memoize that derivation.

```tsx
const Row = React.memo(function Row({ row }: { row: RowModel }) {
  const sortedCells = useMemo(
    () => [...row.cells].sort(byColumn), // copy first, then sort the copy
    [row.cells]
  );
  return <>{sortedCells.map(renderCell)}</>;
});
```

`[...row.cells]` allocates a fresh array so `sort` never touches the shared model. `useMemo` keyed on `row.cells` recomputes only when the underlying reference actually changes, so you keep the performance win without corrupting anyone else's view.

How to spot it in review: in-place array methods (`sort`, `reverse`, `splice`) applied to a prop, especially inside a component that "just displays" data. Display code must treat its inputs as read-only and copy before reordering.

Production symptom: cross-row corruption in grids and lists, virtualized rows showing yesterday's order, and bugs that only appear after a user interacts with a *different* row, the classic action-at-a-distance signature of shared-reference mutation.

**Self-check rubric:**
- [ ] I named `sort` as in-place returning the same reference.
- [ ] I explained why virtualization re-reading the model surfaces the corruption.
- [ ] My fix copies before sorting and memoizes the derived array.
- [ ] I kept memoization intact rather than disabling it.

### ajr-l4-set-same-reference-noop: setState with the same reference is a no-op

- **id:** `ajr-l4-set-same-reference-noop`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** immutability, react, reducers

#### Learn

There is a widespread belief that the functional updater form of `setState`, the `setX(prev => ...)` version, is somehow special and escapes the reference check. It does not. React runs the exact same `Object.is` comparison on whatever the updater *returns*. The updater lets you read the latest state safely across batches, but its return value is subject to the identical bail-out.

So this never updates the screen:

```tsx
const [user, setUser] = useState({ name: "", age: 0 });

const rename = (name: string) =>
  setUser((u) => {
    u.name = name;  // mutate the draft
    return u;       // ... and hand back the SAME object
  });
```

`u` is the current state object. Assigning `u.name = name` mutates it in place. Returning `u` gives React back the same reference it already had. React computes `Object.is(prevUser, returnedUser)`, gets `true`, and bails out. The field on screen never changes even though `user.name` in memory is now correct.

The fix is to return a new object:

```tsx
const rename = (name: string) => setUser((u) => ({ ...u, name }));
```

`{ ...u, name }` builds a fresh object with the updated field. `Object.is(prevUser, newUser)` is now `false`, so React commits and the input updates live.

Two clarifications that come up constantly:

`useReducer` behaves identically. A reducer that mutates `state` and returns it triggers the same bail-out. Reducers are not exempt, the whole point of a reducer is to return the *next* state as a new value, and if you `state.count++; return state` you get the same no-op. Immer exists precisely to let you write mutation-looking reducer code that actually produces a new reference under the hood.

A new object with identical field values *does* re-render. `Object.is({a:1}, {a:1})` is `false` because they are different references. React does not deep-compare, so returning a fresh copy always commits even if nothing "meaningfully" changed. That is the flip side of the same rule: identity is all that matters, both for the bail-out and for forcing an update.

**Interview nuance:** the crisp statement is "React bails out on `Object.is` of the updater's return value, the functional form does not skip the identity check." If someone claims "the updater form guarantees a re-render," they have the mechanism backwards. The updater guarantees you read fresh state, not that you produced a new reference.

Recap: the functional updater is still subject to the `Object.is` bail-out on its return value, so mutating the draft and returning it is a no-op, return a fresh object (or use Immer) to commit.

#### See it live

**Demo (react-demo):** one input wired through a mutate-in-updater setter, a second identical input wired through a spread-in-updater setter, each with a render badge.

The widget renders two labeled text fields, "Mutate updater" and "Spread updater," each backed by its own `useState({ name: "" })`. Both call the functional updater form on every keystroke; the difference is only the return value. Each field shows a **renders: N** badge and the current `name` from state next to it. Type into both.

```tsx
function NameField({ mode }: { mode: "mutate" | "spread" }) {
  const [user, setUser] = useState({ name: "" });
  const renders = useRef(0);
  renders.current += 1;

  const onChange = (name: string) =>
    setUser((u) => {
      if (mode === "mutate") { u.name = name; return u; }  // same ref -> bail-out
      return { ...u, name };                               // new ref -> commit
    });

  return (
    <label>
      <input value={user.name} onChange={(e) => onChange(e.target.value)} />
      <span>renders: {renders.current} · name: {user.name}</span>
    </label>
  );
}
```

**Watch:** the "Mutate updater" input appears stuck: as you type, the visible value never changes and its **renders** badge never ticks, because each updater returns the same object and React bails out. (Its `user.name` in memory is actually updating, it just never re-renders to show it.) The "Spread updater" input updates live and its badge climbs one per keystroke. Same functional-updater syntax on both, only the return reference differs, which proves the updater form does not skip the `Object.is` check.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Explain why `setUser(u => { u.name = name; return u })` never updates the screen even though it uses the functional updater, then rewrite the updater to return a new object.

**Think about:**
- Does the functional updater skip the `Object.is` check?
- Is the same true for `useReducer`?
- Does a new object with identical field values re-render?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

Corrected updater:

```tsx
const rename = (name: string) => setUser((u) => ({ ...u, name }));
```

Why the original is a no-op: the functional updater does not get special treatment. React takes whatever the updater returns and compares it to the previous state with `Object.is`. In `u => { u.name = name; return u }`, `u` is the existing state object, the assignment mutates it in place, and `return u` hands back that same reference. `Object.is(prevUser, u)` is `true`, so React concludes the state did not change and bails out before rendering. The stored `name` is correct in memory, but no render was scheduled, so the input shows the stale value.

The fix returns a new reference: `{ ...u, name }` spreads the old fields into a fresh object and overrides `name`. Now `Object.is(prevUser, newUser)` is `false` and React commits the update.

`useReducer` is identical: a reducer that does `state.name = name; return state` returns the same reference and bails out the same way. Reducers must return the *next* state as a new value. This is exactly the itch Immer scratches, it lets you write `draft.name = name` and produces a new immutable object for you under the hood.

Does a fresh object with identical values re-render? Yes. `Object.is({...u}, u)` is `false` because they are distinct references, and React never deep-compares. So even a "no-op looking" copy forces a commit. Identity is the whole contract, in both directions.

How to spot it in review: an updater whose body assigns to `prev.something` and then `return prev` (or returns the same identifier it received). The mutate-then-return-same-variable shape is the fingerprint.

Production symptom: form fields, toggles, or settings that "won't update" despite the handler firing and `setState` being called. Console-logging inside the handler shows the value is right, which misleads people into blaming the input or the event, when the real problem is the returned reference.

Misconception to correct: "the functional updater form bypasses the identity check, so it always re-renders." Backwards. It guarantees you read the latest state, not that you returned a new reference.

**Self-check rubric:**
- [ ] I stated React runs `Object.is` on the updater's return value.
- [ ] My fix returns a new object via spread (or Immer), not the mutated draft.
- [ ] I confirmed `useReducer` follows the same rule.
- [ ] I confirmed a fresh object with identical values still re-renders.
- [ ] I corrected the "updater form skips the check" misconception.

#### Practice: real-world variant (save, then reveal)

**Prompt:** In a checkout form backed by `useReducer`, the `UPDATE_FIELD` case does `state.fields[action.name] = action.value; return state` and Redux DevTools shows the action firing with the right payload, but the input never changes on screen. A teammate "fixes" it by wrapping the value in `String(action.value)`. Explain why the input is frozen, why the teammate's fix is a coincidence, and give a correct reducer.

**Model answer (revealed on demand):**

The input is frozen because the reducer mutates `state.fields` in place and returns the same `state` reference. React (or React-Redux's `useSelector`) compares the new state to the old with `Object.is`, sees the same object, and bails out. DevTools still logs the action because dispatch always runs, dispatching is not what's suppressed, the *render* is. The stored value is correct; nothing re-rendered to display it.

Why the teammate's `String(action.value)` "fix" is a coincidence: it does not change the reference story at all. What likely happened is that some *other* dispatch or parent render flushed the already-mutated state around the same time, making it look like the string wrapper helped. It is the intermittent-flush illusion again. Wrapping the value does nothing to the `Object.is` comparison on `state`.

Correct reducer, new references along the changed path:

```tsx
case "UPDATE_FIELD":
  return {
    ...state,
    fields: { ...state.fields, [action.name]: action.value },
  };
```

Every object from the root down to the changed field is replaced: a new `state`, a new `fields`. Now `Object.is(prev, next)` is `false` and the commit happens. If the reducer is large, Immer's `produce` lets you keep the mutation-style syntax (`draft.fields[action.name] = action.value`) while it returns a new immutable tree for you.

How to spot it in review: any reducer case that assigns into `state.x` or `state.x.y` and then `return state`. Reducers must be pure and return the next state as a new value, so a mutate-then-return-state case is always suspect.

Production symptom: "the field/toggle won't update but the action fires," settings that revert, and fixes that appear to work because an unrelated dispatch re-rendered the tree. The bug tracks reference identity, not payload content, which is why value-level tweaks like `String(...)` never reliably fix it.

**Self-check rubric:**
- [ ] I explained dispatch runs but the render bails on `Object.is(state)`.
- [ ] My reducer clones `state` and `fields` along the changed path.
- [ ] I explained the `String()` fix as an unrelated flush, not a real fix.
- [ ] I mentioned Immer as the mutation-style-but-immutable option.

### ajr-l4-map-set-fresh-container: Map and Set state need a fresh container

- **id:** `ajr-l4-map-set-fresh-container`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** immutability, map-set, react

#### Learn

`Map` and `Set` are the sharpest version of this bug, because their mutators do not even *pretend* to return a new collection. `set.add(x)` mutates the set and returns the set itself. `set.delete(x)` returns a boolean. `map.set(k, v)` returns the map. None of them hand you a new reference, so storing a `Map` or `Set` in state and mutating it is guaranteed to bail out.

The classic case is selection stored in a `Set`:

```tsx
const [selected, setSelected] = useState<Set<string>>(new Set());

const toggle = (id: string) => {
  selected.add(id);        // mutates in place, returns the same Set
  setSelected(selected);   // same reference -> Object.is true -> bail-out
};
```

Nothing highlights. `selected.add(id)` returns the same `Set` you already had, `setSelected` compares it with `Object.is` against the previous value, they are identical, and React skips the render. Meanwhile `selected.size` in memory has genuinely grown, so a debug probe reading `.size` ticks up while no chip lights.

The fix is to build a fresh container from the old one, apply the change to the copy, and set that:

```tsx
const toggle = (id: string) =>
  setSelected((prev) => {
    const next = new Set(prev); // copy
    next.has(id) ? next.delete(id) : next.add(id);
    return next;                // new reference -> commit
  });
```

`new Set(prev)` allocates a new `Set` seeded from the old entries, so `Object.is(prev, next)` is `false` and React re-renders. The Map idiom is the mirror image:

```tsx
setById((prev) => {
  const next = new Map(prev);
  next.set(id, value);
  return next;
});
```

One trap to avoid: `new Set(prev).add(id)` works as a compact one-liner *for `Set`* because `add` returns the set, so `setSelected(new Set(prev).add(id))` is valid. But `new Map(prev).set(k, v)` also returns the map, so that one-liner is fine too, whereas `new Map(prev).delete(k)` returns a boolean and would set your state to `true`. When in doubt, use the explicit copy-then-mutate-then-return form above, it always reads correctly.

The performance tradeoff: copying a `Map`/`Set` on every update is O(n) in the number of entries. For selection sets of tens or hundreds this is irrelevant. For very large collections (thousands+) updated at high frequency, you either accept the copy, batch updates, or reach for a persistent/immutable data structure library. But you never get to skip the copy just because the collection is big, that trades a perf worry for a correctness bug.

**Interview nuance:** the giveaway of understanding is knowing that `Map`/`Set` mutators return the collection or a boolean, never a new reference, so they cannot be spread the way arrays and objects are. `{...map}` and `[...set]` do not even give you back a usable `Map`/`Set` (spreading a `Map` gives an array of entries, spreading a `Set` gives an array of values). The copy constructor `new Set(prev)` / `new Map(prev)` is the right tool.

Recap: `Map`/`Set` mutators change in place and return the collection or a boolean, so React bails out, always construct a fresh `new Set(prev)` / `new Map(prev)`, mutate the copy, and return it.

#### See it live

**Demo (react-demo):** a row of toggle chips whose selection lives in a `Set`, with a mode switch between "mutate" (`set.add` then `setSelected(set)`) and "copy" (`new Set(prev)`), plus a render badge and a live `.size` probe.

The widget renders 6 chips and a **mode** toggle. In mutate mode, clicking a chip does `selected.add(id); setSelected(selected)`. In copy mode it does the `new Set(prev)` version. A **renders: N** badge sits above the chips, and a debug line reads **set size: N** straight from `selected.size`. Click chips in each mode.

```tsx
function ChipRow({ mode }: { mode: "mutate" | "copy" }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    if (mode === "mutate") {
      selected.add(id);        // same Set reference
      setSelected(selected);   // bail-out
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;           // fresh reference -> commit
      });
    }
  };

  const isOn = (id: string) => selected.has(id);
  // chips call toggle(id) and read isOn(id) for highlight
}
```

**Watch:** in mutate mode, clicking chips never highlights any chip and the **renders** badge stays frozen, yet the **set size** probe climbs 1, 2, 3, because the `Set` really is growing, React just never re-rendered to paint the highlight. In copy mode, chips highlight instantly and the badge ticks with each click. The moving size probe next to the dead chips is the `Map`/`Set` bail-out made visible.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Fix a selection stored in a `Set` where `selected.add(id); setSelected(selected)` never highlights the chip, using `new Set(selected)`, and explain what `Set` mutators return that causes the bail-out.

**Think about:**
- What do `Map`/`Set` mutators return?
- What are the copy idioms for `Map` and `Set`?
- What is the perf tradeoff for large collections?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

Corrected toggle:

```tsx
const toggle = (id: string) =>
  setSelected((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
```

(The compact `setSelected(new Set(selected).add(id))` also works because `Set.prototype.add` returns the set, but the copy-then-mutate-then-return form reads unambiguously and survives being changed to a `delete` later.)

Why the original bails out: `selected.add(id)` mutates the `Set` in place and returns the same `Set` instance. `setSelected(selected)` therefore hands React the identical reference it already held. React runs `Object.is(prevSet, selected)`, gets `true`, and skips the render. The selection genuinely grew, but React only watches the reference, so nothing repaints and no chip highlights.

What the mutators return, the crux: `Set.prototype.add` returns the set, `Set.prototype.delete` returns a boolean, `Map.prototype.set` returns the map, `Map.prototype.delete` returns a boolean. None of them returns a new collection. That is why you cannot mutate-in-place and expect a new reference, and it is why `add`/`set` can be chained in a one-liner but `delete` cannot.

The copy idioms: `new Set(prev)` and `new Map(prev)` construct a fresh collection seeded from the old entries. Mutate that copy, return it, and `Object.is` sees a new reference so React commits. Note you cannot use spread here: `[...set]` yields an array of values and `[...map]` yields an array of entries, neither is a `Set`/`Map`, so the copy constructor is the correct tool.

Perf tradeoff: `new Set(prev)` / `new Map(prev)` is O(n) in entries. For selections of tens to hundreds this is negligible. For very large, high-frequency collections you batch, or use a persistent data structure library, but you never skip the copy to save time, that swaps a perf concern for a correctness bug.

How to spot it in review: `.add`, `.set`, or `.delete` called on a state value, followed by `setState` of that same variable. If the collection being set is the same identifier that was just mutated, it is this bug.

Production symptom: toggles, multi-select, and highlight states that never visually change even though the handler runs and the underlying size is correct.

Misconception to correct: "Maps and Sets spread like arrays and objects." They do not, spreading them produces arrays, not collections, so `new Set(prev)` / `new Map(prev)` is required.

**Self-check rubric:**
- [ ] I stated `add`/`set` return the collection and `delete` returns a boolean.
- [ ] My fix uses `new Set(prev)` / `new Map(prev)`, not spread.
- [ ] I explained the `Object.is` bail-out on the same reference.
- [ ] I noted the O(n) copy cost and when it matters.
- [ ] I corrected the "spread like arrays" misconception.

#### Practice: real-world variant (save, then reveal)

**Prompt:** A spreadsheet app stores per-cell edits in `useState<Map<string, CellValue>>` and applies bulk edits in a loop: `for (const [k, v] of edits) draft.set(k, v); setCells(draft)` where `draft` is the current state map. After a paste of 500 cells, nothing updates until the user clicks a single cell. Explain the failure, give a correct bulk-apply, and address the performance concern for a 50,000-cell paste.

**Model answer (revealed on demand):**

The failure is the same bail-out, hidden inside a loop. `draft` is the current state `Map`, the loop calls `draft.set(k, v)` 500 times mutating it in place, and `setCells(draft)` passes back the same reference. `Object.is(prev, draft)` is `true`, React bails, nothing repaints. The single-cell click later triggers a normal immutable update that finally re-renders and flushes all 500 already-applied edits at once, which is why it "fixes itself" on the next click.

Correct bulk-apply, one fresh copy, all edits applied to it, returned once:

```tsx
setCells((prev) => {
  const next = new Map(prev);
  for (const [k, v] of edits) next.set(k, v);
  return next; // one new reference for the whole batch
});
```

You copy the map a single time and batch every edit into that one new reference, so React commits exactly one re-render for the whole paste. Doing `new Map(prev)` *inside* the loop would be O(n²) and pointless, the copy belongs outside the loop.

Performance for a 50,000-cell paste: `new Map(prev)` is O(n) in existing entries, so a large map copied on every keystroke could stutter. Options in order of reach: (1) batch edits so you copy once per paste, not once per cell, which the code above already does; (2) shard state so a paste only copies the affected region/sheet, not the entire workbook; (3) for genuinely huge, hot collections, use a persistent/immutable structure (Immer's `produceWithPatches`, or a library like Immutable.js) that shares unchanged internal structure and gives O(log n) or structurally-shared updates. What you never do is mutate `prev` in place to dodge the copy, that reintroduces the bail-out.

How to spot it in review: a loop of `.set`/`.add`/`.delete` on a state collection followed by `setState` of that same collection. The loop disguises the mutate-then-set-same-reference fingerprint but it is the same bug.

Production symptom: bulk operations (paste, select-all, import) that appear to do nothing until an unrelated single edit flushes them, and large-grid jank when someone "fixes" it by copying the whole map on every keystroke.

**Self-check rubric:**
- [ ] I identified the in-loop mutation returning the same map reference.
- [ ] My fix copies once outside the loop and returns one new reference.
- [ ] I rejected copying inside the loop as O(n²).
- [ ] I gave a real scaling strategy (batch, shard, or persistent structure).
- [ ] I explained the single-click "fix" as an unrelated flush.

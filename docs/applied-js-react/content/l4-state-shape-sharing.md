> Module **4.3** (State Shape & Sharing) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [4.2](./l4-copy-semantics.md) · Next: [5.1](./l5-render-triggers.md)

# L4 · State Shape & Sharing

How you shape and share state decides whether React can skip work, whether two components secretly write to the same object, and whether a value that changes ever shows up on screen. After this module you can catch the four shape bugs that look fine in review: cloning too much (or too little) on an update, initializing state from a shared object, storing what you could derive, and hiding UI-driving data in a ref.

### ajr-l4-structural-sharing: Structural sharing: clone only the path you change

- **id:** `ajr-l4-structural-sharing`  ·  **difficulty:** hard  ·  **est:** 16 min  ·  **demo:** js-runnable  ·  **skills:** immutability, structural-sharing, memo

#### Learn

Immutable update does not mean "copy the whole tree". It means: produce a new reference for every node on the path from the root down to the field you changed, and reuse the exact same reference for every subtree you did not touch. That reuse is called structural sharing, and it is the entire reason `React.memo`, `useMemo`, and selector libraries can skip work.

Take a state tree:

```js
const state = {
  user: {
    address: { city: "Reno", zip: "89501" },
    prefs:   { theme: "dark", emails: true },
  },
  session: { id: "abc" },
};
```

Say you want to change `user.address.city`. The correct update touches only the spine, root then `user` then `address`:

```js
function updateCity(state, city) {
  return {
    ...state,                         // new root
    user: {
      ...state.user,                  // new user
      address: { ...state.user.address, city }, // new address
      // prefs is NOT spread: same reference on purpose
    },
  };
}
```

After this, `next !== state`, `next.user !== state.user`, and `next.user.address !== state.user.address`, because those are the nodes that changed identity. But `next.user.prefs === state.user.prefs` and `next.session === state.session`, because you never rebuilt them. A `React.memo` component that receives `prefs` compares its prop by reference (`Object.is`), sees the same object, and skips its render entirely.

Now the two ways to get this wrong. Mutation writes through the tree in place: `state.user.address.city = city`. Every reference stays equal, so `memo` sees no change and skips a render that should have happened; the screen shows stale data. Over-cloning does the opposite: `structuredClone(state)` (or a deep clone helper) rebuilds every node, so `prefs` and `session` also get fresh references, and every memoized child that reads them re-renders even though their data is identical.

Interview nuance: this is exactly what Immer and Redux Toolkit do under the hood. Immer's "mutate the draft" syntax is not mutation; the producer diffs your writes and copies only the touched path, preserving refs everywhere else. If an interviewer asks "how does Immer stay fast", the answer is structural sharing, not clever cloning.

Interview nuance: `structuredClone` is the wrong default for state updates. It is a correctness tool for detaching data across a boundary (postMessage, caching a snapshot), not an update primitive. Reaching for it per keystroke turns an O(path) update into an O(tree) one and defeats every memo below.

Recap: rebuild only root-to-field, keep every untouched subtree by reference; mutation under-invalidates (skips renders you needed) and deep clone over-invalidates (fires renders you did not).

#### See it live

**Demo (js-runnable):** a nested immutable update printing a reference-identity table for root, user, address, prefs, and a sibling, run three ways so you can compare.

```js
// Shared starting tree
function makeState() {
  return {
    user: {
      address: { city: "Reno", zip: "89501" },
      prefs: { theme: "dark", emails: true },
    },
    session: { id: "abc" },
  };
}

function report(label, prev, next) {
  const same = (a, b) => (a === b ? "reused (same)" : "NEW (fresh)");
  console.log(`\n--- ${label} ---`);
  console.log("root    :", same(prev, next));
  console.log("user    :", same(prev.user, next.user));
  console.log("address :", same(prev.user.address, next.user.address));
  console.log("prefs   :", same(prev.user.prefs, next.user.prefs));
  console.log("session :", same(prev.session, next.session));
  console.log("city is now:", next.user.address.city);
}

// A) structural sharing: clone only the path root -> user -> address
function updateCityShared(state, city) {
  return {
    ...state,
    user: {
      ...state.user,
      address: { ...state.user.address, city },
    },
  };
}
{
  const prev = makeState();
  const next = updateCityShared(prev, "Sparks");
  report("A) structural sharing", prev, next);
  // memo child reading prefs sees the SAME object -> would skip render
  console.log("memoPrefsChild re-renders?", next.user.prefs !== prev.user.prefs);
}

// B) over-cloning: deep clone the whole tree
function updateCityDeepClone(state, city) {
  const copy = structuredClone(state);
  copy.user.address.city = city;
  return copy;
}
{
  const prev = makeState();
  const next = updateCityDeepClone(prev, "Sparks");
  report("B) deep clone (over-cloning)", prev, next);
  console.log("memoPrefsChild re-renders?", next.user.prefs !== prev.user.prefs);
}

// C) mutation: write in place (identities never change)
function updateCityMutate(state, city) {
  state.user.address.city = city;
  return state;
}
{
  const prev = makeState();
  const snapshotUser = prev.user; // hold the old ref
  const next = updateCityMutate(prev, "Sparks");
  console.log("\n--- C) mutation ---");
  console.log("root    :", next === prev ? "reused (same)" : "NEW (fresh)");
  console.log("user    :", next.user === snapshotUser ? "reused (same)" : "NEW (fresh)");
  console.log("city is now:", next.user.address.city);
  console.log("memo sees a change?", next.user !== snapshotUser, "(false = render skipped, stale UI)");
}
```

**Watch:** in variant A, `root`, `user`, and `address` print NEW while `prefs` and `session` print reused, so a memoized child on `prefs` would not re-render. In variant B every line prints NEW, so that same memoized child re-renders for nothing. In variant C nothing changes identity, so `memo` sees no change and skips the render even though the city actually changed. The three tables side by side prove that correctness (A) lives between under-invalidation (C) and over-invalidation (B).

#### Apply: think, then answer (save, then reveal)

**Prompt:** Write `updateCity(state, city)` so that `user` and `address` are new objects but `state.user.prefs` is the SAME reference, then assert `next.user.prefs === prev.user.prefs` and `next.user.address !== prev.user.address`.

**Think about:**
- Which nodes get a new reference and which stay?
- Why does preserving refs make memo actually skip?
- What does over-cloning cost?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

Spread only the spine from the root to the changed field, and leave every sibling subtree alone:

```js
function updateCity(state, city) {
  return {
    ...state,
    user: {
      ...state.user,
      address: { ...state.user.address, city },
    },
  };
}

const prev = {
  user: { address: { city: "Reno" }, prefs: { theme: "dark" } },
};
const next = updateCity(prev, "Sparks");

console.assert(next !== prev);                              // root: new
console.assert(next.user !== prev.user);                    // user: new
console.assert(next.user.address !== prev.user.address);    // address: new
console.assert(next.user.prefs === prev.user.prefs);        // prefs: SAME
```

Mechanism: React compares props and memo/`useMemo` dependencies by reference using `Object.is`. A component that receives `prefs` re-renders only when `prefs` is a different object. Because you rebuilt just the three nodes on the path to `city`, `prefs` is byte-for-byte the same reference, so React short-circuits that whole subtree. The nodes you did change get fresh references, so the components reading `address` correctly do re-render. Reference identity is your render signal, and structural sharing is how you send it precisely.

How to spot it in review: two shapes are red flags. A deep assignment like `state.user.address.city = city` is a mutation: it changes data without changing any reference, so memoized consumers go stale. A `structuredClone(state)` or deep-clone helper at the top of an updater is over-cloning: it hands new references to `prefs` and `session` too, so every memoized child re-renders.

Production symptom: over-cloning shows up as a slow, jank-on-keystroke form where the profiler shows dozens of untouched components re-rendering per update. Mutation shows up as the opposite, a value that is correct in the store but never repaints, or repaints only when some unrelated state nudges the parent.

Common misconception corrected: "the immutable way is to deep-clone the state and edit the copy." That is immutable in the technical sense (you did not touch the original), but it throws away structural sharing and defeats memoization. The immutable-and-fast way is to copy only the path you change. Immer and Redux Toolkit give you mutable-looking syntax that compiles down to exactly this path copy.

**Self-check rubric:**
- [ ] Root, `user`, and `address` are new references after the update.
- [ ] `next.user.prefs === prev.user.prefs` holds (sibling preserved).
- [ ] I can state why memo skips: reference equality via `Object.is`.
- [ ] I named the mutation failure (stale UI) and the over-clone failure (extra renders).
- [ ] I did not use `structuredClone` or a deep clone as the updater.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Predict the render cost and fix it. On the "Notifications" settings screen a `useReducer` handles a `TOGGLE_EMAIL` action with `return structuredClone({ ...state, prefs: { ...state.prefs, email: !state.prefs.email } })`. The tree also holds a 4,000-row `history` array and a memoized `<HistoryTable rows={state.history} />`. Product reports that toggling one checkbox freezes the tab for ~200ms. Say why, then rewrite the reducer.

**Model answer (revealed on demand):**

The freeze is the `structuredClone` wrapper. The inner spread already produced a correct immutable update: new root, new `prefs`, same `history`. Wrapping the result in `structuredClone` then deep-copies everything again, including all 4,000 `history` rows, on the main thread, per checkbox toggle. Worse, the clone gives `history` a brand new array reference, so `<HistoryTable>`'s `React.memo` sees a changed prop and re-renders the entire table for a change that had nothing to do with it. You pay the clone cost and the re-render cost together.

Fix: drop the clone. The spread is the update.

```js
function reducer(state, action) {
  switch (action.type) {
    case "TOGGLE_EMAIL":
      return {
        ...state,
        prefs: { ...state.prefs, email: !state.prefs.email },
        // history is untouched: same reference, HistoryTable skips
      };
    default:
      return state;
  }
}
```

Now `next.history === prev.history`, so the memoized table does not re-render, and the update is O(size of prefs), not O(4,000 rows). Mechanism recap: the deep clone was severing structural sharing, converting a cheap reference-preserving update into a full-tree copy plus a full-table re-render.

How to spot it in review: any reducer or updater whose outermost call is `structuredClone`, `cloneDeep`, or `JSON.parse(JSON.stringify(...))`. Those belong at boundaries (snapshotting for undo, posting to a worker), never as the update itself. If you want mutable syntax, reach for Immer's `produce`, which preserves `history`'s reference automatically because you never wrote to it.

Interview nuance: the tell that someone understands React performance is that they treat reference identity as a signal to protect, not a detail. "Why is one checkbox re-rendering a 4,000-row table" has the same root cause as "why is my `useMemo` never hitting": a new reference was manufactured for data that did not change.

### ajr-l4-shared-init-object: Shared reference from a module/prop initializer

- **id:** `ajr-l4-shared-init-object`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** immutability, useState, sharing

#### Learn

`useState(initialValue)` stores whatever reference you pass, and it stores it once, on the first render of that component instance. If the value you pass is an object created outside the component (a module-level constant, or an object handed in via props), then every instance that initializes from it starts out pointing at the same object in memory. They are not copies. They are aliases.

Here is the trap:

```js
const DEFAULT_FORM = { title: "", tags: [] };

function TagForm() {
  const [form, setForm] = useState(DEFAULT_FORM); // stores THE constant
  function addTag(t) {
    form.tags.push(t);        // mutates the shared array
    setForm({ ...form });     // new wrapper, same tags array
  }
  // ...
}
```

`DEFAULT_FORM` is created exactly once when the module loads. Mount three `TagForm`s and all three call `useState(DEFAULT_FORM)`, so all three `form` states point at the same object, and all three `form.tags` point at the same array. The moment one form does `form.tags.push("urgent")`, the tag appears in the other two, because there is only one array. The `setForm({ ...form })` makes it worse by looking correct: you spread a new wrapper object, but `tags` inside it is still the original shared array.

The same bug arrives through props: `useState(props.defaults)` seeds your state with the parent's object, and a later mutation writes back into the parent's data.

Two fixes, and the difference matters. Pass a fresh object, ideally with a lazy initializer so you do not allocate on every render:

```js
const [form, setForm] = useState(() => ({ title: "", tags: [] }));
```

The `() =>` form runs once per instance and returns a brand new object per mount, so no two instances share anything. And stop mutating: `setForm(f => ({ ...f, tags: [...f.tags, t] }))` builds a new array instead of pushing into the existing one. Either alone hides the bug in a single-instance test; you want both.

Interview nuance: this is why linters flag mutating props and why "default props objects" are a classic footgun. A default like `function C({ config = {} })` also creates a fresh object per call, which is safe, but a module-level `const DEFAULT = {}` used as a default is shared. The shared-vs-fresh distinction is the whole bug.

Interview nuance: passing an object literal inline, `useState({ tags: [] })`, does give each instance a fresh object (a new literal per render), but React only keeps the first render's copy and discards the rest, so you allocate garbage every render for no benefit. The lazy initializer both isolates instances and avoids the waste.

Recap: `useState(obj)` aliases the object you pass; a module constant or prop is one shared object across all mounts, so seed with a lazy factory and update without mutating.

#### See it live

**Demo (react-demo):** mount three form copies that all initialize from one shared module-level default object, then type a tag into the first form and press Add.

The widget renders three side-by-side `TagForm` cards (labeled Form A, B, C), each with a text input and an "Add tag" button, and each showing its own `tags` list plus the array's identity (a short hash of the reference). Above them a toggle switches between "Shared default (buggy)" and "Lazy factory (fixed)". In buggy mode all three cards display the same identity hash. Type "urgent" into Form A and click Add: the tag pops into A, B, and C at once, and all three identity hashes stay equal, proving one array is shared. Flip the toggle to the lazy factory: each card now shows a distinct identity hash, and adding a tag to Form A leaves B and C empty.

```tsx
const DEFAULT_FORM = { tags: [] as string[] };

function BuggyTagForm() {
  const [form, setForm] = useState(DEFAULT_FORM); // aliases the constant
  const add = (t: string) => {
    form.tags.push(t);          // mutates the SHARED array
    setForm({ ...form });       // new wrapper, same tags ref
  };
  return <Card tags={form.tags} idHash={refHash(form.tags)} onAdd={add} />;
}

function FixedTagForm() {
  const [form, setForm] = useState(() => ({ tags: [] as string[] })); // fresh per mount
  const add = (t: string) =>
    setForm((f) => ({ ...f, tags: [...f.tags, t] })); // new array, no mutation
  return <Card tags={form.tags} idHash={refHash(form.tags)} onAdd={add} />;
}
```

**Watch:** in buggy mode a tag added to Form A appears instantly in Forms B and C and every card shows the same `idHash`, which is direct proof they share one array. In fixed mode each card has its own `idHash` and edits stay local. This is genuine React `useState` behavior, not a simulation: the shared reference really is stored once per instance from the same constant.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Show that every mounted instance shares one `tags` array given `const DEFAULT = { tags: [] }; const [form, setForm] = useState(DEFAULT); ... form.tags.push(x)`, then fix the initializer so each instance is isolated.

**Think about:**
- What does `useState(obj)` actually store?
- How does a module constant get shared across mounts?
- What is the fix?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The bug is two joined mistakes: initializing from a shared object, and then mutating it. Fix both.

```js
function TagForm() {
  // fresh object AND fresh array per instance
  const [form, setForm] = useState(() => ({ tags: [] }));

  function addTag(x) {
    setForm((f) => ({ ...f, tags: [...f.tags, x] })); // no push
  }
  // ...
}
```

Proof of the original sharing: mount two instances and log `a.form.tags === b.form.tags`. With `useState(DEFAULT)` it is `true`, because `DEFAULT` and its `tags` array are created once at module load and both `useState` calls store that same reference. `push` then writes into the one array, so both instances see the tag.

Mechanism: `useState` does not clone its argument. It saves the reference on the first render and returns that same reference on every later render until you call the setter with a new value. A module-level `const` is evaluated a single time for the whole app, so it is one object shared by every component that names it. The lazy initializer `() => ({ tags: [] })` is a function React calls once per instance, so each mount gets its own object graph. The functional update with `[...f.tags, x]` guarantees you never mutate the array you were handed, which also keeps reference identity meaningful for any memo below.

How to spot it in review: a `useState`, `useRef`, or `useReducer` initial value that is an imported name or a prop, especially when the code later calls `.push`, `.sort`, `.splice`, or assigns into that state. The pairing of "shared initializer" plus "in-place mutation" is the signature.

Production symptom: spooky cross-instance state. A user edits one row's draft and another row changes; a second modal opens pre-filled with the first modal's edits; tests pass in isolation but the bug appears only when two instances are alive at once. It also survives navigation because the module constant lives as long as the tab does, so state "leaks" between visits.

Common misconception corrected: "each component instance gets its own copy of a module-level default." It does not. Instances share the exact object unless you produce a fresh one with a factory (or clone at the boundary). React isolates state slots per instance, but it never isolates the reference you chose to put in them.

**Self-check rubric:**
- [ ] I showed `a.tags === b.tags` is true with the shared initializer.
- [ ] The fix uses a lazy factory `useState(() => ...)`, not an inline literal.
- [ ] Updates build a new array instead of `push`.
- [ ] I explained that a module `const` is created once for the whole app.
- [ ] I named the symptom (cross-instance / cross-navigation leaking state).

#### Practice: real-world variant (save, then reveal)

**Prompt:** Find the leak and fix it. A `<CommentEditor draft={draftFromParent} />` seeds its state with `const [draft, setDraft] = useState(props.draft)` and, on autosave, does `props.draft.body = draft.body; save(props.draft)`. QA reports that opening the editor for comment #12, editing, closing, then opening comment #12 again shows the parent list row already displaying the unsaved edit. Explain the shared-reference path and rewrite the component boundary.

**Model answer (revealed on demand):**

There are two shared-reference sins. First, `useState(props.draft)` stores the parent's object, so the child's `draft` state and the parent's `draft` prop are the same object on the first render. Second, the autosave writes `props.draft.body = draft.body`, mutating the parent's data directly. Even before `save` resolves, the parent list is holding the very object you just mutated, so its row renders the unsaved edit the next time the parent re-renders. The value "leaks" upward because there was never a boundary between parent data and child state.

Fix: clone at the boundary on the way in, and never write to the prop on the way out.

```tsx
function CommentEditor({ draft: incoming, onSave }: Props) {
  // own copy per mount; keyed by id so a different comment resets it
  const [draft, setDraft] = useState(() => ({ ...incoming }));

  function autosave() {
    onSave({ ...draft });   // hand up a new object, do not mutate incoming
  }
  // ...
}

// parent controls identity so switching comments remounts fresh state
<CommentEditor key={comment.id} draft={comment} onSave={persist} />
```

Mechanism: the lazy `() => ({ ...incoming })` gives the editor its own object, so edits stay local until you explicitly lift them via `onSave`. Passing `key={comment.id}` makes React unmount and remount the editor when the selected comment changes, which re-runs the initializer with the new comment (the derived-state reset pattern) instead of the stale first draft. `onSave({ ...draft })` sends a fresh object up so the parent decides whether to commit it, rather than the child scribbling into shared memory.

How to spot it in review: `useState(props.x)` combined with any later `props.x.foo = ...` or passing `props.x` itself into a mutating call. The clone-in, copy-out boundary is missing.

Production symptom: unsaved edits appearing in list views, edits surviving a cancel, and "why did this change" reports that only reproduce when the same record is opened twice in a session. It is the classic "child mutated the parent's data" leak, and it is invisible in a single-open test.

### ajr-l4-derived-vs-stored-state: Derived state vs stored state

- **id:** `ajr-l4-derived-vs-stored-state`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** derived-state, react, effects

#### Learn

If a value can be computed from props or other state, computing it during render is almost always correct, and copying it into its own `useState` plus a `useEffect` that resyncs it is almost always a bug. The copy creates a second source of truth, and the two drift.

The anti-pattern:

```js
function List({ items }) {
  const [count, setCount] = useState(items.length);   // copy 1
  useEffect(() => { setCount(items.length); }, [items]); // resync
  return <p>{count} items</p>;
}
```

Trace what React does when `items` changes. React renders with the old `count`, commits that to the DOM (so the screen briefly shows the stale number), then runs the effect, which calls `setCount`, which schedules a second render with the new value. Two renders, and one painted frame showing the wrong count. The effect version is strictly worse than deriving: it is slower and it flashes stale data.

The fix is to delete the state and compute in render:

```js
function List({ items }) {
  const count = items.length;   // one source of truth, always fresh
  return <p>{count} items</p>;
}
```

No effect, no second render, no stale frame. `count` cannot drift from `items` because it is not stored anywhere. Reach for `useMemo` only when you have measured that the computation itself is expensive (filtering ten thousand rows), and even then it is deriving, not storing, just with a cache.

The one legitimate need people confuse with this is resetting state when an identity changes, for example clearing a form when you switch to a different record. The answer is not an effect that copies props into state. It is a `key`:

```jsx
<Editor key={record.id} record={record} />
```

Changing `key` remounts the component, which re-runs its initializers with the new record. This is React's blessed "reset derived state on identity change" mechanism, and it beats a sync effect because there is no stale-then-correct flash.

Interview nuance: "you almost never need an effect to keep state in sync with other state" is straight from the React docs' You Might Not Need an Effect. If a value is derivable, an effect that recomputes it is a smell that costs a render and a frame. Effects are for synchronizing with things outside React (the DOM, a subscription, the network), not for computing.

Interview nuance: the double render is not a Strict Mode artifact. Strict Mode double-invokes in dev to surface impurity, but the render-then-effect-then-render sequence here happens in production too. The extra render is inherent to setting state from an effect.

Recap: derive in render for a single always-fresh source of truth; storing a derived value plus a sync effect buys you a stale frame and an extra render, and identity resets belong to `key`, not an effect.

#### See it live

**Demo (react-demo):** two panels compute the same filtered list. The left panel stores the result in state and resyncs with `useEffect`; the right derives it inline during render. A shared search box filters both, and each panel shows a render-count badge.

The widget renders a search input over a fixed list, feeding two `ResultsPanel`s. The left "Stored" panel keeps `filtered` in `useState` and a `useEffect([query])` that calls `setFiltered`. The right "Derived" panel computes `filtered` in render. Each panel has a render-count badge and briefly highlights in red when the count it displays does not match the current query (a stale frame). Type quickly in the search box: the Stored panel's badge climbs about twice as fast and flickers a stale count for a frame on each keystroke; the Derived panel's badge climbs once per keystroke and never shows a stale value.

```tsx
function StoredPanel({ items, query }: Props) {
  const [filtered, setFiltered] = useState(() =>
    items.filter((i) => i.includes(query)),
  );
  useEffect(() => {
    setFiltered(items.filter((i) => i.includes(query))); // 2nd render + stale frame
  }, [items, query]);
  const renders = useRenderCount();
  return <Panel rows={filtered} renders={renders} />;
}

function DerivedPanel({ items, query }: Props) {
  const filtered = items.filter((i) => i.includes(query)); // one pass, always fresh
  const renders = useRenderCount();
  return <Panel rows={filtered} renders={renders} />;
}
```

**Watch:** the Stored panel renders twice per keystroke (its badge advances by two) and flashes the previous query's results for one frame before the effect corrects it; the Derived panel renders once and is correct in that single pass. This is real React behavior, not a simulation: the second render comes from `setState` inside the effect, and the stale frame is the commit that happened before the effect ran.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Delete the stored `count` from `const [count, setCount] = useState(items.length); useEffect(() => setCount(items.length), [items])`, derive it inline, and demonstrate that the effect version renders twice per `items` change while the derived version renders once.

**Think about:**
- Why does the effect version render twice?
- When should you store versus compute?
- How do you reset derived state on identity change?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

Delete the state and the effect; compute in render.

```js
function List({ items }) {
  const count = items.length; // derived, single source of truth
  return <p>{count} items</p>;
}
```

Mechanism of the double render: when `items` changes, React (1) renders `List` with the current `count`, which is still the previous length, (2) commits that render to the DOM, so the old number is briefly on screen, (3) runs the effect, which calls `setCount(items.length)`, (4) schedules and performs a second render with the new value. Setting state from an effect always produces this render, commit, effect, render sequence, so you pay two renders and paint one stale frame. Deriving `count = items.length` runs inside the single render that already happened, so it is fresh on the first commit and there is nothing to resync.

When to store versus compute: compute (derive) whenever the value is a pure function of props or other state. Store only genuinely independent state, meaning something the user or the server owns that you cannot recompute, like the raw text a user typed or a server response. `items.length`, a filtered list, a formatted string, a total, are all derivations.

Resetting on identity change: if you truly need per-record state that starts from the new record, do not sync with an effect. Give the component a `key` tied to the record id, `<List key={listId} items={items} />`, so React remounts it and re-runs initializers with fresh values. That resets derived-from-props state with no stale frame.

How to spot it in review: a `useState` whose initial value is derived from props (`useState(props.x.length)`, `useState(computeFrom(props))`) paired with a `useEffect` that calls that state's setter from the same props. That pairing is the fingerprint of redundant state.

Production symptom: a value that flickers to its previous state for a frame on every update (a count, a label, a filtered list flashing the old query), plus doubled renders that show up in the Profiler as two commits per interaction. At scale the extra commit is also extra reconciliation on every keystroke.

Common misconception corrected: "I need an effect to keep the derived value in sync." You do not. The render is the sync. An effect that recomputes state from props is slower and introduces a stale intermediate state that the pure derivation never has.

**Self-check rubric:**
- [ ] I deleted both the `useState` and the `useEffect`.
- [ ] `count` is computed directly in render.
- [ ] I can explain the render, commit, effect, render sequence.
- [ ] I distinguished derivable values from genuinely independent state.
- [ ] I used `key` (not an effect) for identity resets.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Diagnose the flash and cut the render count. A `<DataGrid rows={rows} sortKey={sortKey} />` keeps `const [sorted, setSorted] = useState(rows)` and `useEffect(() => setSorted([...rows].sort(by(sortKey))), [rows, sortKey])`. Users report that changing the sort column shows the old order for a beat before snapping to the new one, and the Profiler shows two commits per sort click on a 5,000-row grid. Rewrite it and say what changed at the mechanism level.

**Model answer (revealed on demand):**

The grid is storing a value it should derive. On each `sortKey` change React renders with the previous `sorted`, commits it (the old order the user sees for a beat), then the effect sorts and calls `setSorted`, forcing a second render and commit. On 5,000 rows that second commit is a full reconciliation of the grid, so the cost is real, not just cosmetic.

Derive the sorted rows in render, and memoize only because the sort is measurably expensive at this size:

```tsx
function DataGrid({ rows, sortKey }: Props) {
  const sorted = useMemo(
    () => [...rows].sort(by(sortKey)),
    [rows, sortKey],
  );
  return <Grid rows={sorted} />;
}
```

Mechanism: `useMemo` computes during the same render that saw the new `sortKey`, so the first commit already shows the correct order, no stale frame. It recomputes only when `rows` or `sortKey` change, so typing elsewhere does not re-sort. Critically this is still derivation, not a second source of truth; there is no `sorted` state to drift from `rows`, and no effect to fire a second render. You go from two commits per sort to one, and you drop the stale-order flash entirely.

How to spot it in review: `useState(rows)` (or any prop) plus a `useEffect` that sorts, filters, or maps those props back into the setter. The tell is that the effect's dependency array is exactly the inputs of the computation, which means it is computing, and computing belongs in render.

Production symptom: the "old order flashes then corrects" report, doubled commits in the Profiler on every sort or filter interaction, and on large grids a visible hitch because the extra commit re-reconciles thousands of rows.

Interview nuance: reach for `useMemo` here because you measured a 5,000-row sort, not reflexively. The correctness fix is deriving in render; `useMemo` is only the caching layer you add once profiling shows the sort itself is the cost. Deriving without measuring first would be fine for a small grid; memoizing without measuring is premature.

### ajr-l4-ref-mutation-vs-state: useRef mutation never re-renders (and when that is a bug)

- **id:** `ajr-l4-ref-mutation-vs-state`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** refs, react, state

#### Learn

A ref is a mutable box that survives re-renders, and writing to `ref.current` is deliberately invisible to React. There is no subscription, no scheduling, no reconciliation triggered by a ref write. That is the whole point of refs: a place to keep a value across renders without causing renders. It is also exactly why reading a ref in JSX gives you stale UI.

The bug:

```jsx
function Counter() {
  const countRef = useRef(0);
  function onClick() {
    countRef.current++;        // value really does change...
    console.log(countRef.current); // 1, 2, 3 in the console
  }
  return <button onClick={onClick}>{countRef.current}</button>;
}
```

Click the button and the console prints 1, 2, 3, so the write is happening. But the button label stays at 0. React only re-runs a component (and re-reads its JSX) when state or props change. A ref write changes neither, so no render is scheduled, so the JSX that interpolates `countRef.current` is never re-evaluated. The DOM keeps showing the value from the last render, which was the initial 0.

The rule: if a value drives what the user sees, it belongs in state. If a value must persist across renders but does not appear in the output, a ref is right. Correct ref uses are DOM node handles (`ref={inputEl}`), timer and interval ids, the latest-value box for a callback, a "previous value" for comparison, a mutable flag like "did this already submit", and any bookkeeping that must not trigger a render. The moment you interpolate `ref.current` into JSX and expect it to update, you have picked the wrong tool.

The fix for the counter is simply state:

```jsx
const [count, setCount] = useState(0);
function onClick() { setCount((c) => c + 1); } // schedules a render
return <button onClick={onClick}>{count}</button>;
```

Interview nuance: people reach for refs to "avoid re-renders", and for values that do not drive UI that is legitimate and even good (a scroll position you only read in an event handler, a mutable cache). The mistake is using a ref to avoid re-renders for a value that does drive UI. You cannot have both "no render" and "the screen updates"; a render is how the screen updates.

Interview nuance: a ref write followed by an unrelated state update will make the ref value appear on screen, because the state change triggered a render that happened to re-read the ref. That coincidence is what makes this bug so confusing in practice: the label updates sometimes (whenever something else renders the component) and not others, which looks nondeterministic until you see that renders are the trigger.

Recap: `ref.current` writes never schedule a render, so a ref value read in JSX stays stale; put UI-driving values in state and keep refs for DOM nodes, timers, previous values, and other non-render data.

#### See it live

**Demo (react-demo):** a single click handler bumps both a ref and a state counter on every click, and the component renders both labels next to a console overlay.

The widget renders one "Increment both" button and two large labels: "Ref-backed: N" and "State-backed: N". Each click runs `refCount.current++` and `setStateCount(c => c + 1)`, and appends a line to an on-screen console overlay showing the ref's new value. Click it several times: the console overlay proves the ref is incrementing (1, 2, 3, 4), the State-backed label counts up in step, but the Ref-backed label stays frozen at 0. A "Force unrelated re-render" button flips a dummy boolean state; press it and the Ref-backed label suddenly jumps to the ref's current value, demonstrating that only a render, not the write, updates the screen.

```tsx
function RefVsState() {
  const refCount = useRef(0);
  const [stateCount, setStateCount] = useState(0);
  const [, forceRerender] = useReducer((x) => x + 1, 0);

  function onClick() {
    refCount.current++;            // write is real but invisible to React
    setStateCount((c) => c + 1);   // schedules a render
    log(`ref.current is now ${refCount.current}`);
  }

  return (
    <>
      <p>Ref-backed: {refCount.current}</p>    {/* stays at 0 */}
      <p>State-backed: {stateCount}</p>        {/* updates */}
      <button onClick={onClick}>Increment both</button>
      <button onClick={forceRerender}>Force unrelated re-render</button>
    </>
  );
}
```

**Watch:** the console overlay shows `ref.current` climbing 1, 2, 3 while the Ref-backed label stays at 0, which proves the write succeeded but did not repaint. Pressing "Force unrelated re-render" makes the Ref-backed label snap to the current ref value, proving that a render (from any state change) is what reads the ref into the DOM. This is real React behavior, not a simulation: ref writes genuinely do not schedule renders.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Explain why `const countRef = useRef(0); countRef.current++; return <span>{countRef.current}</span>` does not update on click, and state the rule for when a value belongs in a ref versus in state.

**Think about:**
- Are ref writes visible to reconciliation?
- What are the correct uses of a ref?
- When does a value belong in state instead?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The label does not update because a ref write does not schedule a render, and only a render re-reads the JSX. `countRef.current++` mutates the box, but React has no subscription on it; nothing tells React to re-run `Counter`, so `<span>{countRef.current}</span>` is never re-evaluated and the DOM keeps the last rendered value (0). The fix is to make the value state:

```jsx
function Counter() {
  const [count, setCount] = useState(0);
  return (
    <button onClick={() => setCount((c) => c + 1)}>{count}</button>
  );
}
```

Mechanism: React re-renders a component only when its state or props change. `useState`'s setter schedules a render; `ref.current =` does not. Rendering is the mechanism that turns a JavaScript value into DOM, so a value that must show up on screen has to flow through state (or props). Refs are intentionally outside that loop so you can store things across renders without paying for a render.

The rule: put a value in state if it drives the UI (anything you read in JSX and expect to update). Put a value in a ref if it must persist across renders but does not appear in the output. Correct ref uses: a DOM node (`inputRef.current.focus()`), a timer or interval id you clear later, the latest value for a stable callback, the previous value for a comparison, a "has already submitted" guard, and other bookkeeping that should not cause renders.

How to spot it in review: `ref.current` being mutated and then interpolated into JSX, or a component that reads `someRef.current` in its returned markup and expects it to change. If the value is both written during interactions and rendered, it is state wearing a ref costume.

Production symptom: a number or label that never updates on screen even though logging proves it is changing, or the more baffling version where it updates only sometimes, specifically whenever some unrelated state change happens to re-render the component. Bug reports read as "the counter is stuck" or "it only updates when I also click this other thing."

Common misconception corrected: "refs are a way to avoid re-renders for values that drive UI." Refs do avoid re-renders, but that is precisely why they cannot drive UI. You cannot skip the render and still update the screen; the render is the update. Use a ref to avoid renders only for values the user never sees rendered.

**Self-check rubric:**
- [ ] I said ref writes do not schedule a render, so JSX is not re-read.
- [ ] The fix moves the UI-driving value into `useState`.
- [ ] I listed valid ref uses (DOM, timers, previous value, guards).
- [ ] I gave the rule: UI-driving to state, non-render persistence to ref.
- [ ] I named the "updates only on unrelated re-render" symptom.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Fix the stuck timer display, and keep the interval handling correct. A `<Stopwatch />` does `const secondsRef = useRef(0); useEffect(() => { const id = setInterval(() => secondsRef.current++, 1000); return () => clearInterval(id); }, []); return <div>{secondsRef.current}s</div>`. The elapsed seconds never appear on screen even though a `console.log` in the interval shows them counting. Rewrite it, and explain which value belongs in state and which stays a ref.

**Model answer (revealed on demand):**

The display is stuck because `secondsRef.current++` inside the interval never schedules a render, so `<div>{secondsRef.current}s</div>` is only ever evaluated on the first render, when it was 0. The console counts up because the write is real; the screen does not because there is no render. The elapsed time drives the UI, so it must be state. The interval id, by contrast, is bookkeeping the user never sees, so it correctly stays a ref (or a local `const` inside the effect).

```tsx
function Stopwatch() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setSeconds((s) => s + 1); // functional update, schedules a render
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return <div>{seconds}s</div>;
}
```

Mechanism: `setSeconds((s) => s + 1)` schedules a render every tick, so React re-reads the JSX and the DOM shows the new value. The functional updater matters because the effect runs once (empty deps) and the interval callback closes over the first render's scope; reading `seconds` directly would always see 0, but `s => s + 1` gets the latest committed value from React. The interval id lives in the effect closure and is cleared on unmount, so it does not need to be reactive at all.

How to spot it in review: a ref being incremented on a timer, subscription, or event and then rendered. The pattern "mutate `ref.current` on an interval, read `ref.current` in JSX" cannot update the screen by construction.

Production symptom: a timer, progress indicator, or live counter frozen at its initial value while logs show it advancing, often filed as "the clock stopped" even though the underlying value is fine.

Interview nuance: the split is the lesson. UI-driving value to state (so renders happen), infrastructure handle (interval id, socket, observer) to a ref or effect-local variable (so it persists without renders). Getting both right in one component is the signal that you understand what refs are actually for.

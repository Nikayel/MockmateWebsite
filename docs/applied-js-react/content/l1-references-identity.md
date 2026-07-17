> Module **1.2** (References, Value & Identity) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [1.1](./l1-closures-capture.md) · Next: [1.3](./l1-this-binding.md)

# L1 · References, Value & Identity

After this module you can catch the whole family of bugs that come from JavaScript holding objects and arrays by reference: a "copy" that mutates its source, a spread that only cloned the top level, an effect that refetches on every keystroke, and a `typeof` guard that lets `null` through. These are the everyday React and JS traps that look like framework bugs but are really just reference and identity semantics.

### ajr-l1-reference-vs-value-aliasing: Reference vs value: aliasing and shared-reference mutation

- **id:** `ajr-l1-reference-vs-value-aliasing`  ·  **difficulty:** easy  ·  **est:** 12 min  ·  **demo:** js-runnable  ·  **skills:** references, mutation, identity

#### Learn

JavaScript stores primitives (numbers, strings, booleans, `null`, `undefined`, symbols, bigints) by value and everything else (objects, arrays, functions) by reference. The distinction only becomes visible at the moment of assignment. When you write `let x = 5; let y = x;`, `y` gets its own copy of the number `5`, and reassigning `y` cannot touch `x`. When you write `const a = [1, 2]; const b = a;`, no array is copied. Both `a` and `b` are two labels pointing at the exact same array in memory.

That means `b.push(3)` does not create a new array. It reaches through the shared reference and mutates the one array that both names point at. Read `a` afterward and it is also `[1, 2, 3]`, because there was only ever one array.

```js
const a = [1, 2];
const b = a;        // copies the reference, NOT the contents
b.push(3);
console.log(a);     // [1, 2, 3]  <- a changed too
console.log(a === b); // true    <- same object identity
```

The trap is that `=` looks like copying. For a primitive it is. For an object it copies the pointer, so you end up with aliases, not clones. To get an independent copy you have to explicitly build a new object: `const b = [...a]` for arrays or `const b = {...o}` for objects. Now `b` has its own top-level container and `b.push(3)` leaves `a` alone.

**Interview nuance:** the reliable way to say "are these the same object" is `Object.is(a, b)` (or `a === b` for objects), which compares identity, not contents. `[1] === [1]` is `false` because they are two different arrays that happen to hold equal values. Interviewers love this because it explains why React's default bail-out works the way it does.

In React this is the number one source of "my UI did not update" and "my state got corrupted" reports. React's `useState` setter bails out of a re-render when the new value is `Object.is`-equal to the old one. If you mutate the existing state object and pass the same reference back (`state.items.push(x); setState(state)`), React sees the identical reference, assumes nothing changed, and skips the render. Worse, you have now mutated the object other code (memo snapshots, undo history, props passed to children) was still holding. The fix and the render trigger are the same action: build a new reference. `setState([...state.items, x])` gives React a different array, so the `Object.is` check fails, and the render fires.

**Recap:** `=` copies the value for primitives and the reference for objects/arrays. Aliases share one object, so mutating through one alias changes every holder. Copy with `[...a]` or `{...o}` when you need independence, and remember React bails out on reference equality, so mutation both corrupts shared state and silently suppresses renders.

#### See it live

**Demo (js-runnable):** create an array, alias it with plain assignment, push through the alias, then print both "copies" and their identity so you can see they grew together.

```js
// A) Alias by plain assignment: b IS a
const a = ["apple", "banana"];
const b = a;                 // copies the reference, not the contents
b.push("cherry");
console.log("A) a =", a);    // ["apple","banana","cherry"]
console.log("A) b =", b);    // ["apple","banana","cherry"]
console.log("A) same object? a === b:", a === b); // true

// B) Real copy with spread: c is independent of source
const source = ["apple", "banana"];
const c = [...source];       // builds a NEW array
c.push("cherry");
console.log("B) source =", source); // ["apple","banana"]  <- untouched
console.log("B) c =", c);           // ["apple","banana","cherry"]
console.log("B) same object? source === c:", source === c); // false
```

**Watch:** In variant A the two logged arrays are identical and `a === b` is `true`, proving there was only ever one array and the alias mutated it for both names. In variant B `source` stays two items while `c` has three, and `source === c` is `false`, proving `[...source]` created a genuinely separate array. The contrast is the whole lesson: same reference means shared mutation, new reference means independence.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Predict what `const b = a; b.push(1)` does to `a`, then rewrite so `b` is an independent copy, and name one React state bug this causes.

**Think about:**
- Are primitives and objects assigned the same way?
- What does `=` actually copy for an object?
- How does this interact with setState bail-out?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

`b.push(1)` mutates `a` too. `const b = a` copies the reference, so `a` and `b` label the same array. `push` mutates that one array in place, and `a` now ends in `1` as well. `a === b` is `true` throughout.

To make `b` independent, build a new array before mutating:

```js
const a = [10, 20];
const b = [...a];   // new array, own top-level identity
b.push(1);
console.log(a);     // [10, 20]   unchanged
console.log(b);     // [10, 20, 1]
```

**Why, at the runtime level:** assignment of an object or array value copies the pointer, not the backing store. Both variables reference one heap object, so any in-place method (`push`, `sort`, `splice`, `pop`, or a `b.prop = x` write) is visible through every alias. `[...a]` allocates a fresh array and copies the elements in, giving `b` a distinct identity.

**How to spot it in review:** look for a "copy" produced by plain assignment (`const copy = original`) that is then mutated. Any `x.push`/`x.sort`/`x[i] =` on a value that came from `=` rather than from a spread, `slice()`, `Array.from`, or `structuredClone` is a shared-mutation bug waiting to happen.

**Production symptom:** the classic React version is `const next = state.items; next.push(newItem); setItems(next)`. The component does not re-render because you passed React the same array reference, so the `Object.is(prev, next)` bail-out fires. Meanwhile you have mutated the array that memoized selectors, undo history, and already-rendered children were still holding, so those go stale or corrupt. The correct form is `setItems([...state.items, newItem])`: a new reference both fixes the corruption and triggers the render.

**Common misconception to correct:** "assigning an object to a new variable clones it." It does not. Only primitives are copied by value. For objects and arrays, `=` hands you a second label on the same object. Cloning is always an explicit operation.

**Self-check rubric:**
- [ ] I said `a` becomes `[..., 1]` because `b` is an alias, not a copy.
- [ ] My fix builds a new array (`[...a]`, `slice()`, or `Array.from`) before mutating.
- [ ] I explained that `=` copies the reference for objects and the value for primitives.
- [ ] I named a concrete React bug (missed re-render via `Object.is` bail-out, or corrupted shared state).
- [ ] I noted that `a === b` is `true` for aliases and `false` for genuine copies.

#### Practice: real-world variant (save, then reveal)

**Prompt:** The "Shopping Cart Snapshot" bug. Your checkout code saves an order snapshot for the receipt: `const snapshot = cart.lines; saveSnapshot(snapshot);`. Then the user keeps shopping and the cart updates in place with `cart.lines.push(newLine)`. At payment time the printed receipt shows items the user added AFTER checkout. Find the reference bug and rewrite the snapshot so it is frozen at checkout time, and explain why `saveSnapshot(JSON.parse(JSON.stringify(cart.lines)))` would also fix it but is heavier than needed here.

**Model answer (revealed on demand):**

`const snapshot = cart.lines` stores the same array reference the live cart is still mutating. There is one array; the snapshot is just another label on it. Every later `cart.lines.push(newLine)` reaches through and grows the array the receipt code is holding, so the "frozen" snapshot keeps changing.

Freeze it by copying at capture time:

```js
const snapshot = [...cart.lines]; // new array of the SAME line references
saveSnapshot(snapshot);
```

**Why:** `[...cart.lines]` allocates a new array, so later `cart.lines.push(...)` calls mutate the live array, not the snapshot's array. The snapshot's length is locked to what existed at checkout.

**One caveat that makes this a "real-world" twist:** a shallow copy of the array copies the line *references*. If code later mutates an individual line object in place (`cart.lines[0].qty = 5`), that change still leaks into the snapshot, because both arrays hold the same line objects. If your lines are mutated in place after checkout, you need a deeper copy: `cart.lines.map(line => ({ ...line }))`, or `structuredClone(cart.lines)`.

`JSON.parse(JSON.stringify(cart.lines))` also works and deep-clones everything, which is why people reach for it. But it is heavier and lossy: it drops functions, `undefined`, and `Map`/`Set`, turns `Date` into a string, and throws on cyclic structures. For a flat array of plain line objects it is overkill. Prefer `structuredClone` when you truly need depth, or a targeted `.map(l => ({...l}))` when only one level of nesting matters.

**Production symptom:** receipts, audit logs, and "order confirmed" emails that reflect the cart's *final* state instead of its state at the captured moment. This class of bug is especially nasty because it passes every test that checks the snapshot immediately and only fails when time passes between capture and use.

### ajr-l1-shallow-copy-nested-mutation: Shallow copy only copies the top level

- **id:** `ajr-l1-shallow-copy-nested-mutation`  ·  **difficulty:** medium  ·  **est:** 14 min  ·  **demo:** js-runnable  ·  **skills:** references, immutability, copy

#### Learn

Once you learn to copy before mutating, the next trap is assuming the copy went all the way down. It does not. `{...obj}` and `Object.assign({}, obj)` are shallow. They create a new top-level object and copy each property *value* into it. For primitive properties that means a real copy. For properties that are themselves objects or arrays, the copied value is the reference. The new object and the old object end up pointing at the same nested objects.

```js
const a = { profile: { address: { city: "LA" } } };
const b = { ...a };                 // new top object, SAME inner profile
b.profile.address.city = "NYC";
console.log(a.profile.address.city); // "NYC"  <- a changed too
console.log(a.profile === b.profile); // true  <- shared inner object
```

Picture two boxes. The spread gives you a new outer box (`a !== b`), but inside, both boxes hold the same arrow pointing at one `profile` object, which points at one `address`. Writing `b.profile.address.city` walks down the shared arrows and edits the object `a` still references.

To change `city` immutably you must create a new reference at *every level you touch*, from the root down to the field. That is the "spread the path" rule: clone `state`, clone `state.profile`, clone `state.profile.address`, then set `city`.

```js
const b = {
  ...a,
  profile: {
    ...a.profile,
    address: { ...a.profile.address, city: "NYC" },
  },
};
console.log(a.profile.address.city); // "LA"  <- untouched
```

Every object on the path now has a fresh identity, so `a` and its nested objects are completely undisturbed.

**Interview nuance:** this is also why `React.memo` and `useMemo` on a nested object "miss" changes. If you mutate `state.profile.address.city` in place, `state.profile` keeps the same reference, so a memoized child that receives `profile` sees `Object.is(prevProfile, nextProfile) === true` and skips its update, even though a value inside changed. The path-spread fixes both problems at once: it creates the new references that memo comparisons need. This is the mechanical reason libraries like Immer exist. Immer lets you write the mutating-looking code and produces the correctly-spread immutable result under the hood using a proxy.

**Recap:** spread and `Object.assign` copy one level deep. Nested objects and arrays are shared aliases, not clones. To update a nested field immutably, spread every object along the path from the root to the field so each changed level gets a new reference. This both prevents corrupting the old state and gives memo comparisons the identity changes they rely on.

#### See it live

**Demo (js-runnable):** build a nested object, shallow-copy it with spread, mutate the deep `city`, then show that the original flipped too, and contrast with a correct path spread that leaves the original intact.

```js
// A) Shallow copy: top level differs, inner object is SHARED
const a = { profile: { address: { city: "LA" } } };
const b = { ...a };
b.profile.address.city = "NYC";
console.log("A) a.city =", a.profile.address.city); // "NYC"  leaked!
console.log("A) b.city =", b.profile.address.city); // "NYC"
console.log("A) shared inner? a.profile === b.profile:", a.profile === b.profile); // true

// B) Path spread: new reference at every touched level
const base = { profile: { address: { city: "LA" } } };
const next = {
  ...base,
  profile: {
    ...base.profile,
    address: { ...base.profile.address, city: "NYC" },
  },
};
console.log("B) base.city =", base.profile.address.city); // "LA"  untouched
console.log("B) next.city =", next.profile.address.city); // "NYC"
console.log("B) fresh inner? base.profile === next.profile:", base.profile === next.profile); // false
```

**Watch:** Variant A prints `a.city = NYC`, proving the spread did not protect the nested object: `a.profile === b.profile` is `true`, so the deep write leaked into the original. Variant B prints `base.city = LA` and `base.profile === next.profile` is `false`, proving the path spread created new references at every level and the original is fully preserved. Same spread operator, opposite outcome, because of how deep you copied.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Explain why `const next = {...state}; next.profile.address.city = "NYC"` also changes the old `state`, then rewrite it as a correct nested immutable update.

**Think about:**
- What did the spread actually copy?
- Which levels must you clone to change `city`?
- Why does memo on the nested object also miss the change?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

`{...state}` copied only the top level. `next` is a new outer object, but `next.profile` is the *same* reference as `state.profile`, and `next.profile.address` is the same as `state.profile.address`. Writing `next.profile.address.city = "NYC"` walks down those shared references and mutates the one `address` object that `state` also points at, so `state.profile.address.city` becomes `"NYC"` too.

Correct nested update, spreading every object on the path:

```js
const next = {
  ...state,
  profile: {
    ...state.profile,
    address: {
      ...state.profile.address,
      city: "NYC",
    },
  },
};
```

**Why, at the runtime level:** immutability requires that every object whose contents change gets a new identity. The path from the root to `city` is `state -> profile -> address`. Each of those objects "changes" (it will contain a different descendant), so each must be re-created with a spread. The spread copies the sibling properties you are not touching (by reference, which is fine, they are unchanged) and lets you override the one child on the path.

**How to spot it in review:** a single top-level spread `{...x}` immediately followed by a deep assignment `x.a.b.c = ...`. The spread depth and the assignment depth do not match. Any assignment deeper than one level below a shallow copy is a mutation of shared state.

**Production symptom:** "I used the spread operator and it STILL mutated my state." Undo/redo corrupts because every history entry shares the same nested objects, so editing the present rewrites the past. Memoized children that receive `profile` do not re-render, because `state.profile`'s reference never changed even though a value inside it did.

**Common misconception to correct:** "`{...obj}` is a deep copy." It is a one-level copy. Nested objects and arrays are shared. For a true deep copy use `structuredClone(obj)`, spread the specific path you are updating, or use a library like Immer.

**Self-check rubric:**
- [ ] I said the spread copied only the top level and `next.profile` is shared with `state.profile`.
- [ ] My fix spreads every object on the path root -> profile -> address.
- [ ] I explained that each changed level needs a new reference for immutability.
- [ ] I connected the shared nested reference to a missed `React.memo`/`useMemo` update.
- [ ] I corrected the "spread is a deep copy" misconception (and named `structuredClone` or a path spread).

#### Practice: real-world variant (save, then reveal)

**Prompt:** The "Settings Panel Draft" bug. A settings form clones the saved config into a draft so Cancel can discard edits: `const draft = { ...savedConfig }`. The user toggles `draft.notifications.email = false` and clicks Cancel, but the saved config is now also off, and worse, other open tabs reading `savedConfig` show the change. Fix the draft-copy so Cancel truly discards, explain why a deep list of toggles makes the naive spread especially dangerous, and say when you would reach for `structuredClone` versus a targeted path spread.

**Model answer (revealed on demand):**

`{ ...savedConfig }` is shallow, so `draft.notifications` is the same object as `savedConfig.notifications`. Toggling `draft.notifications.email` mutates the shared `notifications` object, so `savedConfig` changes immediately and Cancel has nothing to restore. Because it is a mutation of the live saved object, anything else holding `savedConfig` (other tabs, a memoized header, a pending save request) sees it too.

For a draft that the user edits field by field, the cleanest fix is a real deep clone at draft-creation time so *every* nested object is independent:

```js
const draft = structuredClone(savedConfig);
// now draft.notifications is a separate object;
// toggling draft.notifications.email cannot touch savedConfig
```

**Why the deep list of toggles makes the naive spread worse:** a settings object is typically a tree of nested groups (`notifications.email`, `privacy.tracking`, `display.theme`). A single top-level spread shares every one of those group objects. As soon as the user touches any nested toggle, that group is corrupted in the saved config. The more nested groups, the more surfaces leak, and the failures look random because they depend on which toggle the user happened to flip.

**`structuredClone` vs path spread:** reach for `structuredClone` when the user can edit arbitrary fields anywhere in the tree and you want a fully independent draft up front, which is exactly the settings-draft case. Reach for a targeted path spread when you are making one known, narrow update to otherwise-immutable state (a reducer setting `config.notifications.email`), because copying only the touched path is cheaper and preserves reference stability for the untouched branches, which keeps memoized children from re-rendering. `structuredClone` clones everything, so every branch gets a new identity and every memoized consumer would re-render.

**Production symptom:** "Cancel does not cancel," settings that persist changes the user explicitly discarded, and cross-tab or cross-component state bleeding where one view's unsaved edits appear in another.

### ajr-l1-object-identity-deps: Object/array/function identity in dependency arrays

- **id:** `ajr-l1-object-identity-deps`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** identity, useEffect, referential-equality

#### Learn

React compares dependency arrays with `Object.is`, one slot at a time. If any dependency is not `Object.is`-equal to its previous value, the effect (or `useMemo`/`useCallback`) re-runs. The catch is that an object, array, or arrow function literal written *inside the component body* is created fresh on every render. Two structurally identical literals are two different references, so `Object.is` reports them as different every single time.

```jsx
function Search({ page }) {
  const options = { page };                 // NEW object every render
  useEffect(() => {
    fetchData(options);                      // runs on EVERY render
  }, [options]);                             // Object.is(prev, next) is always false
}
```

`{ page }` is not the same object as last render's `{ page }`, even when `page` did not change. So `[options]` looks "different" every render, the effect fires every render, and if the effect updates state (which triggers another render, which builds another `options`), you get an infinite loop. The same trap applies to `[]` arrays, inline arrow deps, and inline objects/arrays passed as props to a `React.memo` child: the child never benefits from memoization because its props are new references each render.

There are three good fixes, in rough order of preference:

1. **Depend on the primitive.** If the effect really only cares about `page`, use `[page]`. A number is compared by value, so the effect fires only when `page` actually changes. Build `options` inside the effect. This is the simplest and usually correct choice.
2. **Memoize the object.** `const options = useMemo(() => ({ page }), [page])` keeps the same reference until `page` changes. Use this when several consumers need the object identity to be stable, or the object is expensive to build.
3. **Hoist a truly-constant literal to module scope.** If the object never depends on props or state, define it outside the component so it is created once for the program's lifetime.

**Interview nuance:** the reason `useCallback` and `useMemo` exist at all is referential stability, not raw performance. Their job is to preserve a reference across renders so downstream `Object.is` checks (effect deps, memo props) can short-circuit. If you find yourself wrapping something in `useMemo` only to stabilize a dependency, first ask whether you can depend on a primitive instead: that removes the object from the equation entirely and is more robust than adding a memo whose own dep array can be gotten wrong.

**Recap:** dep arrays compare by identity with `Object.is`, not by value. Inline object/array/function literals get a brand-new reference each render, so they always look changed, which causes effects to fire every render and, when the effect sets state, infinite loops. Fix it by depending on primitives, memoizing the object, or hoisting a genuine constant.

#### See it live

**Demo (react-demo):** a small `SearchBox` widget. It renders a text input labeled "Search page", a live "Effect fired: N" counter badge, and a toggle switch labeled "Stabilize options (useMemo)". As the learner types in the input, the component re-renders on each keystroke. With the toggle OFF, `options` is built inline (`const options = { page }`) and the effect counter increments on every keystroke, visibly climbing. With the toggle ON, `options` is wrapped in `useMemo(() => ({ page }), [page])`, and the counter only increments when `page` actually changes, so it freezes while unrelated re-renders happen (for example a separate "Force re-render" button that bumps a dummy state).

```tsx
function SearchBox() {
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);        // "Force re-render" button
  const [stabilize, setStabilize] = useState(false);
  const effectCount = useRef(0);
  const [, forceBadge] = useState(0);

  // OFF: new object every render.  ON: stable until `page` changes.
  const inlineOptions = { page };
  const memoOptions = useMemo(() => ({ page }), [page]);
  const options = stabilize ? memoOptions : inlineOptions;

  useEffect(() => {
    effectCount.current += 1;                 // count how often the effect runs
    forceBadge((n) => n + 1);                 // repaint the badge
    // imagine: fetchData(options)
  }, [options]);

  return (
    <div>
      <input
        aria-label="Search page"
        value={page}
        onChange={(e) => setPage(Number(e.target.value) || 1)}
      />
      <button onClick={() => setTick((t) => t + 1)}>Force re-render ({tick})</button>
      <label>
        <input
          type="checkbox"
          checked={stabilize}
          onChange={(e) => setStabilize(e.target.checked)}
        />
        Stabilize options (useMemo)
      </label>
      <span data-testid="effect-count">Effect fired: {effectCount.current}</span>
    </div>
  );
}
```

**Watch:** With the toggle OFF, click "Force re-render" (which does not change `page`) and the "Effect fired" badge still climbs, because `inlineOptions` is a new reference each render and `[options]` always looks changed. Flip the toggle ON and click "Force re-render" again: the badge holds steady, and only changing the page number moves it. This proves the effect is firing on *identity*, not on value: `useMemo` freezes the reference so `Object.is(prev, next)` stays `true` across unrelated renders. Note the counter uses a ref plus a forced badge repaint so the display stays honest about actual effect runs.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Stabilize `const options = { page }; useEffect(() => fetchData(options), [options])` that fires every render, and explain the identity mechanic.

**Think about:**
- Why is `{ page }` a new reference each render?
- What is the worst-case loop this creates?
- Which fix is best: memo the object or depend on the primitive?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The effect fires every render because `{ page }` is a freshly allocated object on each render, and React compares deps with `Object.is`. `Object.is(prevOptions, nextOptions)` is always `false` for two different object literals, even when `page` is unchanged, so the dep looks changed every time.

Best fix here, depend on the primitive:

```jsx
useEffect(() => {
  const options = { page };   // build inside the effect
  fetchData(options);
}, [page]);                   // number compared by value: fires only when page changes
```

If other code genuinely needs a stable `options` reference, memoize it instead:

```jsx
const options = useMemo(() => ({ page }), [page]);
useEffect(() => {
  fetchData(options);
}, [options]);
```

**Why, at the runtime level:** every render re-executes the component function, so every object/array/arrow literal in the body is constructed anew and gets a distinct identity. Dependency arrays are compared slot-by-slot with `Object.is`, which is identity for objects. A new reference reads as "changed," so the effect re-runs. Depending on `page` (a primitive) sidesteps identity entirely: `Object.is(1, 1)` is `true`.

**How to spot it in review:** an object, array, or arrow-function literal listed directly in a dependency array, or one passed as a prop to a `React.memo`-wrapped child. Also watch for an effect that both reads an inline object and calls `setState`, which is the shape that infinite-loops.

**Production symptom:** an infinite refetch loop (effect sets state, which re-renders, which rebuilds the object, which re-fires the effect), hammered APIs, and effects that run on every keystroke. In a memo child it shows up as a component that "never memoizes," re-rendering on every parent render because its object prop is always a new reference.

**Common misconception to correct:** "dependency arrays compare object contents." They do not. They compare references with `Object.is`. Two objects with identical fields are still different dependencies.

**Self-check rubric:**
- [ ] I said `{ page }` is a new reference every render and deps compare with `Object.is`.
- [ ] My fix either depends on the primitive `[page]` or wraps `options` in `useMemo`.
- [ ] I explained the worst case: effect sets state -> re-render -> new object -> infinite loop.
- [ ] I stated a preference (primitive dep is simplest) and when memo is warranted.
- [ ] I corrected the "deps compare contents" misconception.

#### Practice: real-world variant (save, then reveal)

**Prompt:** The "Dashboard Filters" refetch storm. A dashboard passes a filter object to a data hook: `const filters = { from, to, team }; const { data } = useReport(filters);`, and inside the hook `useEffect(() => { fetchReport(filters); }, [filters])`. The report refetches on every parent render, even when nothing about the filters changed, and your API rate-limit alarms are firing. The team's first instinct is to `useMemo` the filters object. Stabilize the hook correctly, explain why the naive `useMemo(() => filters, [filters])` would NOT fix it, and describe a more robust approach for many-field filter objects.

**Model answer (revealed on demand):**

The refetch storm is the same identity problem at hook scale: `{ from, to, team }` is a new object every parent render, so the hook's `[filters]` dep always looks changed and `fetchReport` fires each time.

The trap in the "just useMemo it" instinct is the dep array of the memo itself. `useMemo(() => filters, [filters])` memoizes on `filters`, which is the very object that is new each render, so the memo recomputes every render and returns a new reference anyway. You have to memoize on the *primitive* fields, not the object:

```jsx
const filters = useMemo(
  () => ({ from, to, team }),
  [from, to, team],          // primitives compared by value
);
const { data } = useReport(filters);
```

Now `filters` keeps the same reference until one of `from`, `to`, or `team` actually changes, so the hook's effect fires only on real filter changes.

**Even more robust for many-field objects:** rather than trusting a hand-maintained memo dep list (easy to forget a field), stabilize on a serialized key and rebuild inside the effect:

```jsx
const key = JSON.stringify({ from, to, team });
useEffect(() => {
  fetchReport(JSON.parse(key));
}, [key]);                    // string compared by value
```

The string key is a primitive, so identity is a non-issue, and adding a field to the object automatically changes the key. The tradeoffs: `JSON.stringify` is order-sensitive and does not handle functions or non-JSON values, so keep the object flat and serializable. For heavier cases a purpose-built hook like `useDeepCompareEffect` (structural comparison) or lifting the filters into a reducer/store that already returns stable references is cleaner.

**Production symptom:** duplicate in-flight requests, tripped rate limits, spinner flicker on every unrelated interaction, and wasted spend on paid data APIs. It often hides until traffic scales, because a single user barely notices, but the aggregate request multiplier is large.

### ajr-l1-typeof-null-type-checks: typeof null and primitive-vs-reference type checks

- **id:** `ajr-l1-typeof-null-type-checks`  ·  **difficulty:** easy  ·  **est:** 12 min  ·  **demo:** js-runnable  ·  **skills:** type-checks, null, guards

#### Learn

`typeof` is the first tool people reach for to branch on a value's kind, and it quietly lies in two places that matter. `typeof null` is `"object"`, and `typeof []` is `"object"`. So the natural-looking guard `if (typeof x === "object")` lets `null` in and treats arrays as if they were plain objects. Add `typeof NaN === "number"` and you have three classic misclassifications.

```js
console.log(typeof null);      // "object"   <- not "null"
console.log(typeof []);        // "object"   <- not "array"
console.log(typeof {});        // "object"
console.log(typeof function(){}); // "function"
console.log(typeof NaN);       // "number"   <- it is literally Not-a-Number
console.log(typeof undefined); // "undefined"
```

`typeof null === "object"` is a first-version JavaScript bug that could never be fixed without breaking the web, so it is now part of the spec forever. The practical consequence is real crashes:

```js
function normalize(x) {
  if (typeof x === "object") {
    return x.trim?.();   // null slips in here -> reads .trim of null? No:
  }                       // x.trim?.() on null is fine, but x.name, x[0], Object.keys(x) throw
}
```

`null?.trim` is safe, but any non-optional access such as `Object.keys(x)`, `x.length`, or a `for...in` on the value that entered the "is object" branch throws `Cannot read properties of null`. And arrays landing in a "plain object" branch get iterated with `Object.keys` or spread as `{...arr}` when the code expected element access.

The reliable guards, in the order you usually apply them:

```js
x === null                 // exactly null (do this FIRST)
Array.isArray(x)           // exactly an array, cross-realm safe
typeof x === "function"    // callables
typeof x === "number" && !Number.isNaN(x)  // a real number, excluding NaN
// plain object: not null, not array, and object-typed
x !== null && typeof x === "object" && !Array.isArray(x)
```

`Array.isArray` is the correct array test because it works across iframes and realms where `x instanceof Array` fails (a different realm has a different `Array`). For NaN, use `Number.isNaN(x)`, not the global `isNaN` (which coerces, so `isNaN("foo")` is `true`).

**Interview nuance:** primitives are compared by value and objects by reference, and `typeof` reflects that split. But the reason `typeof` cannot distinguish arrays, `null`, and plain objects is not a value/reference issue; it is that `typeof` only has a handful of return strings and predates arrays being a distinct concept in the type tag. Knowing *why* `typeof null` is `"object"` (the historical type-tag collision) is a common senior-screen question.

**Recap:** `typeof null` and `typeof []` both return `"object"`, and `typeof NaN` is `"number"`, so `typeof`-only guards misclassify null, arrays, and NaN. Test `null` explicitly first, use `Array.isArray` for arrays, `typeof === "function"` for callables, and combine checks for a true plain-object test. Reach for `Number.isNaN` over the coercing global `isNaN`.

#### See it live

**Demo (js-runnable):** print a table of `typeof` for each tricky value next to its intended category, and flag every row where `typeof` lands in the wrong bucket.

```js
const cases = [
  { label: "null", value: null, intended: "null" },
  { label: "[]", value: [], intended: "array" },
  { label: "{}", value: {}, intended: "object" },
  { label: "function(){}", value: function () {}, intended: "function" },
  { label: "42", value: 42, intended: "number" },
  { label: "NaN", value: NaN, intended: "number(real)" },
  { label: "undefined", value: undefined, intended: "undefined" },
];

// Map typeof's answer to the bucket it implies, then compare to intent.
function typeofBucket(v) {
  const t = typeof v;               // the naive guess
  return t;                         // "object" for null AND [] AND {}
}

for (const c of cases) {
  const got = typeofBucket(c.value);
  const naiveWrong =
    (c.label === "null" && got === "object") ||   // should be "null"
    (c.label === "[]" && got === "object") ||     // should be "array"
    (c.label === "NaN" && got === "number");      // "real" number test would exclude it
  console.log(
    `${c.label.padEnd(12)} typeof=${got.padEnd(10)} intended=${c.intended.padEnd(12)} ${naiveWrong ? "<-- WRONG BUCKET" : "ok"}`
  );
}

// The correct guards for the three problem rows:
console.log("null === null:", null === null);                 // true
console.log("Array.isArray([]):", Array.isArray([]));         // true
console.log("Array.isArray({}):", Array.isArray({}));         // false
console.log("Number.isNaN(NaN):", Number.isNaN(NaN));         // true
console.log("Number.isNaN(42):", Number.isNaN(42));           // false
```

**Watch:** The table marks three rows `<-- WRONG BUCKET`: `null` and `[]` both report `typeof === "object"` (so a naive object guard swallows both), and `NaN` reports `typeof === "number"` even though it is the value that means "not a real number." The follow-up lines prove the correct guards: `Array.isArray` is `true` only for the array and `false` for the plain object, and `Number.isNaN` isolates the real NaN. This is a static illustration of `typeof`'s return values, not a runtime that "detects" the bug for you, but every printed value is exactly what the engine returns.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Fix `if (typeof x === "object") x.trim?.()` so it does not treat `null` as an object or mishandle arrays, and explain why `typeof` alone is insufficient.

**Think about:**
- What does `typeof null` return and why?
- How do you correctly test for an array, null, and a plain object?
- Are primitives compared by value or reference?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

`typeof x === "object"` is `true` for `null` and for arrays, so both fall into the branch even though neither is the plain object the code expects. The `?.` on `.trim` happens to shield the `null` case here, but any non-optional access in that branch (`Object.keys(x)`, `x.length`, spreading `{...x}`) would throw on `null` or misbehave on an array.

Corrected guard that separates the cases:

```js
function handle(x) {
  if (x === null) return;                 // exclude null FIRST
  if (Array.isArray(x)) {
    return x.map(String);                 // real array handling
  }
  if (typeof x === "string") {
    return x.trim();                      // strings have .trim, objects do not
  }
  if (typeof x === "object") {
    // now guaranteed: not null, not array -> a plain-ish object
    return Object.keys(x);
  }
}
```

**Why, at the runtime level:** `typeof null` is `"object"` because of a first-version type-tag collision in JavaScript that was never fixable without breaking existing code, so it is permanent. Arrays are objects too, so `typeof []` is also `"object"`. `typeof` simply does not have enough return strings to separate `null`, arrays, and plain objects. You need dedicated tests: `x === null` (identity against the singleton `null`), `Array.isArray(x)` (realm-safe array detection), and only then a `typeof x === "object"` check that is now known to mean "plain object."

**How to spot it in review:** any `typeof x === "object"` guard that does not first handle `null` and does not account for arrays. Also `x.trim`/string methods called on a value that could be an object, and `instanceof Array` (which breaks across iframes/realms; prefer `Array.isArray`).

**Production symptom:** `TypeError: Cannot read properties of null (reading '...')` in the "it is an object" branch, and arrays being iterated with `Object.keys` or spread as objects, producing `{0: ..., 1: ...}` shaped garbage instead of element handling. These often come from JSON payloads where a field is sometimes `null` and sometimes an object.

**Common misconception to correct:** "`typeof` reliably tells objects, arrays, and null apart." It does not. Test `null` explicitly, use `Array.isArray` for arrays, and treat `typeof x === "object"` as meaningful only after both exclusions.

**Self-check rubric:**
- [ ] I checked `x === null` before the `typeof === "object"` branch.
- [ ] I used `Array.isArray(x)` (not `instanceof Array`) to detect arrays.
- [ ] I explained `typeof null === "object"` as a permanent historical spec bug.
- [ ] I noted `typeof []` is also `"object"`, so arrays leak into object branches.
- [ ] I named the production symptom (null-access `TypeError` or array-as-object mishandling).

#### Practice: real-world variant (save, then reveal)

**Prompt:** The "API Response Normalizer" bug. A normalizer flattens third-party payloads: `function toFields(v) { if (typeof v === "object") return Object.entries(v).map(...); return [String(v)]; }`. In production it throws `Cannot read properties of null` for some records and produces nonsense like `[["0", "a"], ["1", "b"]]` for records where the field is an array of tags. Harden `toFields` to handle `null`, arrays, plain objects, and NaN-bearing numbers correctly, and explain why a schema-validation layer (Zod) is the more durable fix at an API boundary.

**Model answer (revealed on demand):**

Both failures are `typeof` misclassification. `null` reaches `Object.entries(null)` and throws, and an array reaches the object branch, so `Object.entries(["a","b"])` yields index-keyed pairs `[["0","a"],["1","b"]]` instead of tag handling.

Hardened normalizer with explicit, ordered guards:

```js
function toFields(v) {
  if (v === null || v === undefined) return [];        // no fields
  if (Array.isArray(v)) return v.map(String);          // tags -> ["a","b"]
  if (typeof v === "number") {
    return [Number.isNaN(v) ? "NaN" : String(v)];      // handle NaN explicitly
  }
  if (typeof v === "object") {
    return Object.entries(v).map(([k, val]) => `${k}: ${val}`);
  }
  return [String(v)];                                  // string, boolean, etc.
}
```

Order matters: `null`/`undefined` first (so nothing downstream dereferences them), then `Array.isArray` (before the object branch, since arrays are objects), then number with a `Number.isNaN` guard, then the now-safe plain-object branch.

**Why a schema layer is more durable:** `toFields` is defending at the point of use, but the real problem is that an untrusted API boundary is handing you values of unknown shape. Every consumer of that payload has to re-implement these guards, and any one that forgets reintroduces the crash. A validation layer such as Zod runs once at the boundary, parses the raw response into a known typed shape, coerces or rejects nulls and wrong types up front, and gives every downstream function a value it can trust without defensive `typeof` gymnastics. It also fails loudly at the boundary with a clear error, instead of failing deep inside business logic with a cryptic `Cannot read properties of null`.

**Production symptom:** intermittent `TypeError` crashes tied to specific records (the ones where an optional field is `null`), and silently corrupted output where array fields render as index-keyed objects. These pass local tests with clean fixtures and only break on the messy real payloads.

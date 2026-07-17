> Module **4.2** (Copy Semantics) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [4.1](./l4-mutation-invisible.md) · Next: [4.3](./l4-state-shape-sharing.md)

# L4 · Copy Semantics

After this module you can tell the difference between a "copy" that is really an alias, a spread that only cloned the top level, an array method that mutated its source out from under you, and a deep clone that silently dropped half your data. You will know exactly which tool copies which levels, when React actually wants a copy at all, and how to reach for React 19's copying array methods instead of the old copy-then-mutate dance.

### ajr-l4-shallow-vs-deep-copy: Shallow copy hides nested mutation

- **id:** `ajr-l4-shallow-vs-deep-copy`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** js-runnable  ·  **skills:** immutability, copy, nesting

#### Learn

The spread operator feels like a copy button, and for one level it is. `{ ...obj }` allocates a brand new outer object and copies each own enumerable property *value* into it. The word "value" is the whole trap. For a primitive property (`name: "Ada"`, `age: 40`) the value is the primitive, so you get an independent copy. For a property that is itself an object or array, the value is a *reference*. The spread copies the arrow, not the thing it points at. Your new object and the old object now hold two different arrows that aim at the same nested object.

```js
const state = { profile: { name: "Ada" }, tags: ["admin"] };
const next = { ...state };            // new outer object, SAME inner profile
next.profile.name = "Grace";
console.log(state.profile.name);      // "Grace"  <- the original changed too
console.log(state.profile === next.profile); // true  <- one shared object
```

`state !== next` (the outer boxes differ), but `state.profile === next.profile` (the inner box is shared). Writing `next.profile.name` walks down the shared arrow and edits the one `profile` object that `state` still references. You "made a copy" and corrupted the source anyway.

To update a nested field immutably you have to create a new reference at *every level on the path from the root down to the field you change*. That is the "spread the path" rule. To change `profile.name`, clone `state`, clone `state.profile`, then set `name`:

```js
const next = {
  ...state,
  profile: { ...state.profile, name: "Grace" },
};
console.log(state.profile.name);        // "Ada"   <- untouched
console.log(state.profile === next.profile); // false <- fresh object
```

Only the objects on the path get new identities. `state.tags` is still shared by reference in `next`, which is correct and desirable: you did not change it, so sharing it costs nothing and keeps memoized consumers of `tags` from re-rendering. This is called structural sharing, and it is exactly what React wants.

**Interview nuance:** this is also why a `React.memo` child "misses" a change. If you mutate `state.profile.name` in place, `state.profile` keeps the same reference, so a memoized child receiving `profile` sees `Object.is(prev, next) === true` and skips its update even though a value inside changed. The path spread fixes both problems at once because it mints the new references the `Object.is` comparison needs. This mechanical fact is the reason Immer exists: it lets you write mutating-looking code and produces the correctly path-spread result under the hood using a proxy.

**Recap:** spread and `Object.assign` copy one level deep. Nested objects and arrays are shared aliases, not clones, so a deep write leaks into the original. To update a nested field immutably, spread every object along the path from the root to the field. That both protects the old state and gives memo comparisons the identity changes they depend on.

#### See it live

**Demo (js-runnable):** spread a nested object, mutate `copy.a.b`, then print the original and the copy and their inner identity, and contrast with a correct path spread that leaves the original intact.

```js
// A) Shallow spread: outer differs, inner object is SHARED
const original = { a: { b: 1 }, label: "root" };
const copy = { ...original };
copy.a.b = 999;
console.log("A) original.a.b =", original.a.b);          // 999  leaked!
console.log("A) copy.a.b     =", copy.a.b);              // 999
console.log("A) outer shared? original === copy:", original === copy);       // false
console.log("A) inner shared? original.a === copy.a:", original.a === copy.a); // true

// B) Path spread: new reference at every level you touch
const base = { a: { b: 1 }, label: "root" };
const next = { ...base, a: { ...base.a, b: 999 } };
console.log("B) base.a.b =", base.a.b);                  // 1    untouched
console.log("B) next.a.b =", next.a.b);                  // 999
console.log("B) inner shared? base.a === next.a:", base.a === next.a);        // false
```

**Watch:** In variant A the two boxes at the top differ (`original === copy` is `false`), but both point at one inner object (`original.a === copy.a` is `true`), so mutating `copy.a.b` shows up in `original.a.b` too: both print `999`. This is the two-box reference diagram made real: distinct outer boxes, one shared inner object, so both display the change. In variant B `base.a === next.a` is `false` and `base.a.b` stays `1`, proving the path spread minted a new inner object and left the source alone. Same spread operator, opposite outcome, decided entirely by how deep you copied.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Write a correct nested immutable update for `const next = {...state}; next.profile.name = "X"; setState(next)` (which also changes the old `state`), and explain exactly what the spread copied and what it did not.

**Think about:**
- What did the spread copy and not copy?
- Which levels must you clone?
- Why does memo on the nested object miss the change?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

`{...state}` copied only the top level. `next` is a new outer object, but `next.profile` is the *same* reference as `state.profile`. Writing `next.profile.name = "X"` walks down that shared reference and mutates the one `profile` object `state` also points at, so `state.profile.name` becomes `"X"` too. You copied the outer container and aliased the inner one.

Correct nested update, spreading every object on the path:

```js
const next = {
  ...state,
  profile: { ...state.profile, name: "X" },
};
setState(next);
console.log(state.profile.name); // unchanged
```

**Why, at the runtime level:** immutability requires that every object whose contents change gets a new identity. The path from the root to `name` is `state -> profile`. Both objects "change" (each will contain a different descendant), so both must be re-created with a spread. The spread copies the sibling properties you are not touching by reference, which is fine because they are unchanged, and lets you override the one child on the path. Untouched branches like `state.settings` stay shared, which is the point.

**How to spot it in review:** a single top-level spread `{...x}` immediately followed by a deeper assignment `x.a.b = ...`. The spread depth (one level) and the assignment depth (two-plus levels) do not match. Any write deeper than one level below a shallow copy is a mutation of shared state.

**Production symptom:** undo/redo corrupts because every history entry shares the same nested subtree, so editing the present rewrites the past. Memo snapshots go stale because the cached object was mutated in place. And in React the `setState(next)` may not even re-render the memoized child, because `state.profile`'s reference never changed.

**Common misconception to correct:** "spread makes an immutable deep copy." It does not. `{...obj}` is a one-level copy; nested objects and arrays are shared aliases. For depth, spread the specific path you update, use `structuredClone(obj)`, or reach for Immer.

**Self-check rubric:**
- [ ] I said the spread copied only the top level and `next.profile` is shared with `state.profile`.
- [ ] My fix spreads every object on the path root -> profile.
- [ ] I explained that each changed level needs a new reference for immutability.
- [ ] I connected the shared nested reference to a missed `React.memo`/`useMemo` update.
- [ ] I corrected the "spread is a deep copy" misconception.

#### Practice: real-world variant (save, then reveal)

**Prompt:** The "Feature-Flag Editor" bug. An admin panel edits a nested config tree: `const draft = { ...config }`. A toggle handler does `draft.experiments.newCheckout.enabled = true; save(draft)`. QA reports that clicking Cancel does not revert, and worse, a second admin tab reading `config` immediately shows the flipped flag before anyone saves. Fix the update so the draft is independent, explain why a deeply nested flag tree makes the naive spread especially dangerous, and say when you would reach for `structuredClone` versus a targeted path spread.

**Model answer (revealed on demand):**

`{ ...config }` is shallow, so `draft.experiments` is the same object as `config.experiments`, and `draft.experiments.newCheckout` is shared all the way down. Toggling `draft.experiments.newCheckout.enabled` mutates the live `config` subtree in place, so Cancel has nothing to restore and any other holder of `config` (the second tab, a memoized header, a pending save) sees it instantly.

For a single known update, spread the exact path:

```js
const draft = {
  ...config,
  experiments: {
    ...config.experiments,
    newCheckout: { ...config.experiments.newCheckout, enabled: true },
  },
};
save(draft);
```

For a draft the user can edit anywhere in the tree, clone the whole thing up front instead:

```js
const draft = structuredClone(config); // every nested group is now independent
draft.experiments.newCheckout.enabled = true; // safe: cannot touch config
```

**Why the deep flag tree makes the naive spread worse:** a flag config is a tree of nested groups (`experiments.newCheckout`, `experiments.search`, `limits.rateLimit`). A single top-level spread shares every one of those group objects. The moment the admin touches any nested flag, that whole group is corrupted in the live config. The more nesting, the more surfaces leak, and the failures look random because they depend on which flag was flipped.

**`structuredClone` vs path spread:** reach for `structuredClone` when the user can edit arbitrary fields anywhere in the tree and you want a fully independent draft up front, which is the editor case. Reach for a targeted path spread when a reducer makes one narrow, known update to otherwise-immutable state, because copying only the touched path is cheaper and keeps the untouched branches reference-stable so their memoized consumers do not re-render. `structuredClone` gives every branch a new identity, so every memoized consumer would re-render.

**Production symptom:** "Cancel does not cancel," settings that persist changes an admin explicitly discarded, and cross-tab or cross-component bleeding where one view's unsaved edits surface in another before any save happens.

### ajr-l4-mutating-methods-sort: Mutating vs non-mutating array methods (the sort trap)

- **id:** `ajr-l4-mutating-methods-sort`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** js-runnable  ·  **skills:** immutability, arrays, sort

#### Learn

Array methods split into two camps, and the split is not obvious from how you call them. `sort`, `reverse`, `splice`, `push`, `pop`, `shift`, `unshift`, and `fill` mutate the array in place. `map`, `filter`, `slice`, `concat`, and `flat` never touch the source and return a new array. The dangerous ones are `sort` and `reverse`, because they *both* mutate the original *and* return it. That return value fools you into thinking they behaved like `map`.

```js
const items = [3, 1, 2];
const sorted = items.sort((a, b) => a - b);
console.log(sorted);          // [1, 2, 3]
console.log(items);           // [1, 2, 3]  <- the source was mutated too
console.log(sorted === items); // true  <- same array, not a copy
```

`sorted` is not a new array. It is the exact same array `items` points at, now reordered. So `const sorted = items.sort(...)` is a double bug: it mutates data other consumers still hold, and because it hands back the *same reference*, any React `setState(sorted)` fails the `Object.is` bail-out and skips the re-render. You corrupted the source and did not even repaint.

There is a second, quieter trap: default `sort` with no comparator sorts *lexicographically*, comparing elements as strings.

```js
console.log([1, 10, 2, 21].sort()); // [1, 10, 2, 21]  <- "10" < "2" as strings
```

`10` sorts before `2` because `"10"` compares before `"2"` character by character. Numbers always need an explicit comparator: `.sort((a, b) => a - b)`.

The fix for the mutation is to copy first, then sort the copy: `[...items].sort(...)` or `items.slice().sort(...)`. React 19 gives you a cleaner option, `items.toSorted(...)`, which returns a new sorted array and never touches the source (covered in the last lesson of this module).

**Interview nuance:** the reason `sort`/`reverse`/`splice` return the source rather than a copy is a deliberate design choice for chaining and memory: mutating in place avoids allocating a second array. That was reasonable in 1995 and is a footgun in a reference-equality world like React. Naming the asymmetry (mutators return `this`, copiers return fresh) is a common screen question, and the follow-up is usually "so why does `setState(arr.sort())` not re-render?" The answer is the same-reference bail-out.

**Recap:** `sort`, `reverse`, and `splice` mutate in place and return the same reference; `map`, `filter`, and `slice` return new arrays and leave the source alone. `const sorted = arr.sort()` therefore corrupts `arr` and, in React, skips the render because the reference did not change. Copy before mutating (`[...arr].sort()`), and always pass a comparator when sorting numbers because default sort is lexicographic.

#### See it live

**Demo (js-runnable):** run each common array method on a fresh `[3, 1, 2]`, print the return value and whether the original mutated, then show the default-sort lexicographic bug on `[1, 10, 2]`.

```js
function trial(name, fn) {
  const source = [3, 1, 2];
  const returned = fn(source);
  const mutated = JSON.stringify(source) !== JSON.stringify([3, 1, 2]);
  const sameRef = returned === source;
  console.log(
    `${name.padEnd(10)} returned=${JSON.stringify(returned).padEnd(12)}` +
      ` mutatedSource=${String(mutated).padEnd(5)} sameRef=${sameRef}` +
      ` ${mutated ? "<-- MUTATES (red)" : "(green)"}`
  );
}

// A) Mutators: change the source, hand back the SAME array
trial("sort", (a) => a.sort((x, y) => x - y));
trial("reverse", (a) => a.reverse());
trial("splice", (a) => a.splice(0, 1)); // returns the REMOVED chunk, mutates a

// B) Copiers: source untouched, brand new array returned
trial("map", (a) => a.map((n) => n * 2));
trial("filter", (a) => a.filter((n) => n > 1));
trial("slice", (a) => a.slice());
trial("toSorted", (a) => a.toSorted((x, y) => x - y)); // React 19 / ES2023

// The default-sort lexicographic bug
console.log("default sort [1,10,2]:", [1, 10, 2].sort());            // [1, 10, 2]
console.log("numeric sort  [1,10,2]:", [1, 10, 2].sort((a, b) => a - b)); // [1, 2, 10]
```

**Watch:** The `sort`, `reverse`, and `splice` rows print `mutatedSource=true`, and `sort`/`reverse` also print `sameRef=true`: they glow red because they changed `[3,1,2]` and returned the same array they mutated. The `map`, `filter`, `slice`, and `toSorted` rows print `mutatedSource=false`: they stay green, returning a fresh array and leaving the source at `[3,1,2]`. The last two lines prove the lexicographic trap: bare `.sort()` leaves `[1, 10, 2]` in the wrong order because it compares strings, while the `(a, b) => a - b` comparator produces `[1, 2, 10]`.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Show that `const sorted = items.sort((a, b) => a.rank - b.rank)` (rendered in a component) mutates the source `items` (breaking other consumers), then fix it with a non-mutating alternative and say why the original also skips the re-render.

**Think about:**
- Which methods mutate and which return copies?
- Why is `setState(arr.sort())` a double bug?
- What does default sort compare?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

`items.sort(...)` sorts `items` in place and returns that same array, so `sorted === items`. Every other consumer of `items` (props passed to siblings, a memoized selector, the parent's state) now sees the reordered array, because there is only one array. If `items` came from props or state, you just mutated data you do not own.

Corrected, copy before sorting:

```js
// Classic: copy first, then sort the copy
const sorted = [...items].sort((a, b) => a.rank - b.rank);

// React 19 idiom: returns a new sorted array, never touches items
const sorted19 = items.toSorted((a, b) => a.rank - b.rank);
```

**Why, at the runtime level:** `sort` is an in-place algorithm that reorders the backing array and returns `this`. So `const sorted = items.sort(...)` produces an alias, not a copy. In React this is a double bug. First, mutation: you reordered the array that other components and memo caches still reference, so their view is silently corrupted. Second, the render miss: if you then call `setState(sorted)`, React runs `Object.is(prevState, sorted)`, and since `sorted` is the very same reference as the old state array, the check returns `true` and React bails out of the render. `[...items].sort()` and `items.toSorted()` both allocate a new array, which fixes the corruption and gives React a changed reference to render on.

**How to spot it in review:** `sort`, `reverse`, or `splice` applied directly to a value that came from props, state, `useMemo` inputs, or a store selector. The tell is a mutator called on something you did not just allocate. `[...x].sort()`, `x.slice().sort()`, and `x.toSorted()` are safe; `x.sort()` on shared data is not.

**Production symptom:** a "sort this table" or "reverse the feed" feature that corrupts the underlying list for every other view, plus a UI that does not update after the sort because the state reference did not change. Often it looks like "sorting works the first time but the data is scrambled everywhere else afterward."

**Common misconception to correct:** "`sort`/`reverse`/`splice` return copies like `map`/`slice`." They do not. They mutate in place and return the source (for `splice`, the removed slice). Only `map`, `filter`, `slice`, `concat`, and the `to*` methods give you a new array.

**Self-check rubric:**
- [ ] I showed `sorted === items` and that `items` was reordered in place.
- [ ] My fix copies first (`[...items].sort()`) or uses `items.toSorted()`.
- [ ] I named the render miss: `setState(sorted)` bails out because the reference is unchanged.
- [ ] I noted that default `sort` compares elements as strings (lexicographic).
- [ ] I corrected the "mutators return copies" misconception.

#### Practice: real-world variant (save, then reveal)

**Prompt:** The "Leaderboard Column Sort" bug. A leaderboard stores `players` in state and lets the user click column headers to sort. The handler is `const onSort = (key) => setPlayers(players.sort((a, b) => b[key] - a[key]))`. Users report that after clicking a header once, later filters and the "reset order" button behave randomly, and the first click often does not repaint at all. Fix the handler, explain the two distinct bugs, and describe how you would sort by a *string* column (name) correctly.

**Model answer (revealed on demand):**

There are two bugs stacked on one line. First, `players.sort(...)` mutates the state array in place, so the canonical order React is holding is destroyed. The "reset order" button has no pristine array to restore, and filters that derive from `players` now operate on scrambled data. Second, `sort` returns that same array, so `setPlayers(players.sort(...))` passes React the identical reference; `Object.is(prev, next)` is `true` and the first click does not re-render.

Fix by sorting a copy so state gets a genuinely new array:

```js
const onSort = (key) =>
  setPlayers((prev) => prev.toSorted((a, b) => b[key] - a[key]));
// pre-React-19 equivalent:
// setPlayers((prev) => [...prev].sort((a, b) => b[key] - a[key]));
```

Using the updater form `prev => ...` also avoids sorting a stale closed-over `players`. For a *string* column like name, subtraction produces `NaN` (strings do not subtract), so the comparator must use string comparison instead:

```js
const onSortName = () =>
  setPlayers((prev) =>
    prev.toSorted((a, b) => a.name.localeCompare(b.name))
  );
```

`localeCompare` returns a negative, zero, or positive number and handles accents and locale rules, unlike `a.name > b.name ? 1 : -1`, which is ASCII-only and mishandles case and diacritics.

**Production symptom:** a leaderboard whose "reset to default order" stops working after the first sort, filters that return the wrong rows because they read a mutated array, and a first click that visibly does nothing until a second unrelated render flushes. The data corruption is the expensive part: it silently spreads to every consumer of the shared array.

### ajr-l4-structuredclone-blindspots: structuredClone: real deep clone and its blind spots

- **id:** `ajr-l4-structuredclone-blindspots`  ·  **difficulty:** hard  ·  **est:** 14 min  ·  **demo:** js-runnable  ·  **skills:** immutability, structuredClone, copy

#### Learn

When people finally accept that spread is shallow, the next reflex is `JSON.parse(JSON.stringify(obj))` as a "deep copy." It works for flat JSON-shaped data and quietly destroys everything else. `JSON.stringify` has no representation for `undefined`, functions, or `Symbol`, so it drops those keys entirely. It has no `Date` type, so it serializes dates to ISO strings and `JSON.parse` leaves them as strings. It cannot represent `Map`, `Set`, `BigInt`, or cyclic references (it throws on cycles). What comes back is a lossy, type-flattened shadow of the original.

`structuredClone` is the real deep clone built into modern browsers and Node. It implements the structured clone algorithm, the same one used to send data across `postMessage` and Web Workers. It correctly deep-clones `Date`, `Map`, `Set`, `RegExp`, typed arrays, `ArrayBuffer`, and it handles cyclic references without throwing.

```js
const original = {
  when: new Date("2020-01-01"),
  seen: new Map([["a", 1]]),
  tags: new Set(["x"]),
};
const cloned = structuredClone(original);
console.log(cloned.when instanceof Date); // true   <- still a Date
console.log(cloned.seen instanceof Map);  // true   <- still a Map
console.log(cloned.seen === original.seen); // false <- deep, independent
```

But `structuredClone` has hard blind spots. It *throws* a `DataCloneError` on functions, on Symbol values, and on DOM nodes. And it does not preserve class prototypes: it either throws or returns a plain object without your methods, depending on the type. So a clone of a `class User` instance loses its `User`-ness and its methods.

```js
class User { greet() { return "hi"; } }
structuredClone(new User()); // DataCloneError-adjacent: methods/prototype not preserved
structuredClone(() => {});   // DataCloneError: functions cannot be cloned
```

Here is the senior point most people miss: React almost never wants a deep clone at all. React's model is structural sharing. To update state you create new references only along the path you change and *share* everything else by reference. Deep-cloning your whole state on every update throws away that sharing, so every memoized child re-renders and you pay to copy branches nobody touched. `structuredClone` is a tool for the rare "I need a genuinely independent snapshot of plain-ish data" case, not a make-React-immutable button.

**Interview nuance:** the follow-up is usually "so when *would* you deep clone in a React app?" Good answers: capturing an immutable audit snapshot, seeding an editable draft from server data the user can mutate freely, or copying data before handing it to a library that mutates. The wrong answer is "on every setState," because that fights React's structural-sharing model and tanks memoization.

**Recap:** `JSON.parse(JSON.stringify(x))` is a lossy deep clone that turns `Date` into a string and silently drops `undefined`, functions, `Symbol`, `Map`, and `Set`. `structuredClone` is a real deep clone that preserves `Date`/`Map`/`Set`/typed arrays and cycles, but throws on functions, Symbols, and DOM nodes and does not keep class prototypes. And React usually wants structural sharing, not a deep clone, so reach for `structuredClone` only for genuinely independent snapshots of plain data.

#### See it live

**Demo (js-runnable):** feed one rich object (Date, Map, function, Symbol, undefined, class instance) through spread, `JSON.parse(JSON.stringify(...))`, and `structuredClone`, and print a matrix of what each preserved, lost, or threw on.

```js
class Point { constructor(x) { this.x = x; } dist() { return this.x; } }

function makeRich() {
  return {
    when: new Date("2020-01-01T00:00:00Z"),
    seen: new Map([["a", 1]]),
    run: () => "ran",            // function
    tag: Symbol("t"),            // symbol
    missing: undefined,          // undefined
    pt: new Point(5),            // class instance
  };
}

function report(name, cloneFn) {
  let out;
  try {
    out = cloneFn(makeRich());
  } catch (e) {
    console.log(`${name.padEnd(16)} THREW: ${e.name}`);
    return;
  }
  console.log(
    `${name.padEnd(16)} Date? ${out.when instanceof Date}` +
      ` | Map? ${out.seen instanceof Map}` +
      ` | fn? ${typeof out.run === "function"}` +
      ` | undefinedKey? ${"missing" in out}` +
      ` | Point? ${out.pt instanceof Point}`
  );
}

// A) Shallow spread: keeps types but nested Map/Date are SHARED (not cloned)
report("spread", (o) => ({ ...o }));
// B) JSON round-trip: lossy, type-flattening
report("JSON", (o) => JSON.parse(JSON.stringify(o)));
// C) structuredClone: real deep clone, but throws on function/symbol
report("structuredClone", (o) => structuredClone(o));
```

**Watch:** The `spread` row keeps every type as `true`, but that is misleading honesty: it kept them because it did not clone them at all, it shared the same `Date` and `Map` by reference. The `JSON` row shows the losses: `Date?` is `false` (turned into a string), `fn?` is `false` and `undefinedKey?` is `false` (both keys dropped), and `Point?` is `false` (flattened to a plain object). The `structuredClone` row prints `THREW: DataCloneError` because the object contains a function and a Symbol, which the structured clone algorithm cannot serialize. That single line is the whole lesson: the "real" deep clone is not a universal button. This is genuine runtime output, not an illustration; every value is what the engine actually returns or throws.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Predict which fields of a state object holding a `Date`, a `Map`, a method, and a class instance survive spread vs `JSON.parse(JSON.stringify)` vs `structuredClone`, then choose the right tool and justify it.

**Think about:**
- What does `structuredClone` handle that JSON cannot?
- What does `JSON.parse(JSON.stringify)` silently break?
- Does React actually want a deep clone here?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

Predictions for `{ when: Date, seen: Map, run: () => {}, user: new User() }`:

- **spread `{...state}`**: all keys present, but nothing nested is cloned. `when`, `seen`, and `user` are the *same references* as the source. It is a one-level copy, so any deep mutation still leaks.
- **`JSON.parse(JSON.stringify(state))`**: `when` becomes an ISO string (no longer a `Date`), `seen` becomes `{}` (Maps have no JSON form), `run` is dropped entirely (functions have no JSON form), and `user` flattens to a plain object with its data but no `User` prototype or methods.
- **`structuredClone(state)`**: throws `DataCloneError`, because `run` is a function. If you removed the function, it would deep-clone `when` and `seen` correctly but still strip `user`'s class prototype.

Right tool depends on intent:

```js
// If state is plain-ish data and you need a true independent snapshot:
const snapshot = structuredClone(stateWithoutFunctions);

// If you are doing a normal React update, do NOT deep clone.
// Path-spread only what changed and share the rest:
const next = { ...state, seen: new Map(state.seen).set("b", 2) };
```

**Why, at the runtime level:** the structured clone algorithm has an explicit allowlist of transferable types (`Date`, `Map`, `Set`, `RegExp`, typed arrays, cycles) and rejects everything else (functions, Symbols, DOM nodes) with `DataCloneError`. It also does not walk class prototypes, so instances lose their methods. `JSON` has an even smaller vocabulary: only objects, arrays, strings, numbers, booleans, and `null`, so every richer type is coerced or dropped.

**How to spot it in review:** a `JSON.parse(JSON.stringify(...))` "deep clone" of state that holds `Date`, `undefined`, functions, or `Map`/`Set`, and any `structuredClone` of state that carries callbacks, class instances, or DOM references. Both are latent data-loss or crash bugs.

**Production symptom:** dates rendering as raw ISO strings after a "clone," `undefined` and callback fields vanishing so features silently no-op, or a `DataCloneError` thrown at runtime when a user's state happens to include a function or class instance.

**Common misconception to correct:** "`structuredClone` is the make-React-immutable button." It is a deep-clone primitive with real blind spots, and React usually wants structural sharing, not a deep clone. Deep-cloning every update defeats memoization and copies branches nobody changed.

**Self-check rubric:**
- [ ] I predicted the Date-to-string and dropped-key losses for the JSON round-trip.
- [ ] I noted spread shares nested `Date`/`Map` by reference (no deep copy).
- [ ] I said `structuredClone` throws on the function and strips the class prototype.
- [ ] I chose structural sharing (path spread) for a normal React update, not a deep clone.
- [ ] I named a concrete symptom (DataCloneError or silent type/field loss).

#### Practice: real-world variant (save, then reveal)

**Prompt:** The "Form Autosave Snapshot" bug. A long form autosaves by deep-cloning state for a local draft history: `history.push(JSON.parse(JSON.stringify(formState)))`. Users report that restoring a snapshot loses the "created" date (it comes back as a string that breaks date math), the file `File`/`Blob` attachment vanishes, and any field they left blank (`undefined`) disappears from the restored form. Fix the snapshot strategy, explain which values each tool can and cannot carry, and describe when you should avoid cloning entirely.

**Model answer (revealed on demand):**

The JSON round-trip is destroying non-JSON types. `formState.createdAt` (a `Date`) serializes to an ISO string and never comes back as a `Date`, so date math on restore throws or misbehaves. A `File`/`Blob` attachment has no JSON form and becomes `{}` or drops out. Any field explicitly set to `undefined` is omitted by `JSON.stringify`, so blank fields silently disappear from the restored draft.

For a draft history of rich form data, use `structuredClone`, which preserves `Date`, `Map`, `Set`, typed arrays, and `Blob`/`File`:

```js
history.push(structuredClone(formState)); // Date, Blob, and undefined all survive
```

The one caveat: if `formState` contains any functions (validators, event handlers) or class instances with methods, `structuredClone` throws or strips their prototypes. Keep the *data* you snapshot separate from behavior. Snapshot the serializable form values, not the handlers:

```js
const { onSubmit, validators, ...data } = formState;
history.push(structuredClone(data));
```

**When to avoid cloning entirely:** if you only need to detect that a field changed, do not clone the whole state each keystroke. Store a small primitive signature (a version counter, or a hash of the touched fields) instead, which is cheaper and sidesteps type loss. And if the draft never needs to diverge from live state (for example, you only restore, never edit two branches at once), a structural-sharing approach that keeps unchanged branches shared is lighter than deep-cloning the entire form on every autosave tick.

**Production symptom:** "restore draft" bringing back a form whose dates are broken strings, whose attachments are gone, and whose intentionally-blank fields have vanished, plus autosave getting slow on large forms because every tick deep-clones the entire state tree. The failures are type-specific, so they slip through tests that use only string and number fixtures.

### ajr-l4-immutable-array-methods: React 19 immutable array methods (toSorted/with)

- **id:** `ajr-l4-immutable-array-methods`  ·  **difficulty:** easy  ·  **est:** 10 min  ·  **demo:** js-runnable  ·  **skills:** immutability, react19, arrays

#### Learn

The copy-then-mutate dance (`const c = [...arr]; c.sort(); return c`) is the standard way to update array state without mutation, and it is fine, just verbose and easy to get wrong (forget the spread and you mutate the source). ES2023, shipping in modern browsers and the React 19 baseline, adds the *copying* array methods that do the copy for you: `toSorted`, `toReversed`, `toSpliced`, and `with`. Each returns a new array and leaves the source completely untouched.

```js
const rows = [{ id: 1, on: false }, { id: 2, on: true }];

const sorted = rows.toSorted((a, b) => a.id - b.id); // new array, rows untouched
const reversed = rows.toReversed();                  // new array
const updated = rows.with(0, { ...rows[0], on: true }); // new array with index 0 replaced
console.log(rows === sorted); // false <- source preserved
```

`with(i, value)` is the immutable counterpart to `arr[i] = value`. `arr[i] = value` mutates in place; `arr.with(i, value)` returns a new array where index `i` is replaced and every other slot is shared by reference. That last part is the key: these methods do structural sharing at the element level. `toSorted` returns a new *array container*, but the element objects inside it are the same references as the source. You only pay for one new array, not a deep copy.

```js
const next = rows.with(0, { ...rows[0], on: true });
console.log(next[1] === rows[1]); // true  <- untouched element is shared
console.log(next[0] === rows[0]); // false <- replaced element is new
```

That is exactly what React wants: a new top-level array so the state reference changes and the render fires, with untouched elements sharing identity so their memoized rows do not re-render.

```jsx
setRows((prev) => prev.toSorted(byName));            // sort
setRows((prev) => prev.with(i, { ...prev[i], on: true })); // update one row
```

**Interview nuance:** these methods need an ES2023 runtime (all evergreen browsers and Node 20+). They are the idiomatic React 19 state update, but if you must support old runtimes, `[...arr].sort()` and `arr.map((el, idx) => idx === i ? next : el)` are the equivalent shims. Do not confuse `with` (returns a copy) with the `with` *statement* (a long-deprecated, strict-mode-forbidden language feature); the method is unrelated and safe.

**Recap:** `toSorted`, `toReversed`, `toSpliced`, and `with` return a new array and never mutate the source, doing element-level structural sharing so untouched items keep their identity. They replace the copy-then-mutate dance and are the idiomatic React 19 immutable update. `arr.with(i, v)` is the immutable form of `arr[i] = v`. They require an ES2023 runtime.

#### See it live

**Demo (js-runnable):** run each React 19 copying method beside its mutating twin on a shared source, and print whether the source stayed intact and whether untouched elements are shared.

```js
function check(name, fn) {
  const source = [3, 1, 2];
  const before = JSON.stringify(source);
  const result = fn(source);
  const intact = JSON.stringify(source) === before;
  console.log(
    `${name.padEnd(12)} result=${JSON.stringify(result).padEnd(12)}` +
      ` sourceIntact=${String(intact).padEnd(5)}` +
      ` ${intact ? "(green: source safe)" : "<-- MUTATED (red)"}`
  );
}

// A) Copying methods: return new array, source intact (green)
check("toSorted", (a) => a.toSorted((x, y) => x - y));
check("toReversed", (a) => a.toReversed());
check("with", (a) => a.with(0, 99));

// B) Mutating twins on the SAME source shape (red)
check("sort", (a) => a.sort((x, y) => x - y));
check("reverse", (a) => a.reverse());
check("arr[i]=v", (a) => { a[0] = 99; return a; });

// Element-level structural sharing: only the replaced element is new
const objs = [{ id: 1 }, { id: 2 }];
const next = objs.with(0, { id: 99 });
console.log("shared untouched element? next[1] === objs[1]:", next[1] === objs[1]); // true
console.log("replaced element is new?  next[0] === objs[0]:", next[0] === objs[0]); // false
```

**Watch:** The `toSorted`, `toReversed`, and `with` rows print `sourceIntact=true` and glow green: they returned a new array and left `[3,1,2]` alone. Their mutating twins `sort`, `reverse`, and `arr[i]=v` print `sourceIntact=false` and glow red: same operation, but they rewrote the source. The last two lines prove the structural sharing: after `objs.with(0, ...)`, the untouched element `next[1] === objs[1]` is `true` (shared identity, so a memoized row for it will not re-render), while the replaced `next[0] === objs[0]` is `false`. This is real ES2023 runtime output.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Rewrite `setRows(prev => { const c = [...prev]; c.sort(byName); return c })` and an index update `setRows(prev => { const c = [...prev]; c[i] = { ...c[i], on: true }; return c })` using `prev.toSorted(byName)` and `prev.with(i, ...)`, and say what each method returns and touches.

**Think about:**
- What do these methods return and touch?
- How does `arr.with(i, v)` differ from `arr[i] = v`?
- What runtime support do they need?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

Both updaters simplify to a single copying call:

```jsx
// sort
setRows((prev) => prev.toSorted(byName));

// update one row immutably
setRows((prev) => prev.with(i, { ...prev[i], on: true }));
```

**Why, at the runtime level:** `toSorted(byName)` returns a brand-new array, sorted, and never touches `prev`. `with(i, value)` returns a new array where index `i` holds `value` and every other index shares the original element by reference. So React gets a new array container (its `Object.is` check fails, the render fires) while untouched row objects keep their identity (so memoized rows for unchanged data skip re-rendering). The manual `const c = [...prev]; c.sort()` version does the same thing but in two steps, and it breaks the moment someone forgets the spread and writes `prev.sort()`, which mutates state in place.

**`arr.with(i, v)` vs `arr[i] = v`:** `arr[i] = v` is an in-place mutation. It changes the existing array, returns the value `v` (not the array), and gives React back the same reference, so it both corrupts shared state and skips the render. `arr.with(i, v)` allocates a new array with index `i` replaced, mutates nothing, and returns that new array. It is the immutable expression form of an index write.

**How to spot it in review:** a `[...arr].sort()` or `[...arr].reverse()` copy that can collapse to the `to*` form, and any `c[i] = ...` inside an updater that should be `prev.with(i, ...)`. Also flag bare `prev.sort()`/`prev[i] = ...` in a setter, which is the mutation these methods exist to prevent.

**Production symptom (the fixed state):** clean immutable updates with no accidental source mutation and correct re-renders, because every update produces a new array reference while preserving element identity for memoization. The bug these replace is the copy-then-mutate step where a missing spread silently mutates state.

**Common misconception to correct:** "you always need a full copy-then-mutate dance to update array state." You do not. `toSorted`, `toReversed`, `toSpliced`, and `with` do the copy for you in one call, and they share untouched elements so you are not deep-copying anything.

**Self-check rubric:**
- [ ] I rewrote the sort as `prev.toSorted(byName)` and the update as `prev.with(i, { ...prev[i], on: true })`.
- [ ] I said each method returns a new array and does not touch the source.
- [ ] I contrasted `arr.with(i, v)` (returns a new array) with `arr[i] = v` (in-place, returns the value).
- [ ] I noted untouched elements are shared by reference (structural sharing) so memoized rows do not re-render.
- [ ] I mentioned the ES2023 / React 19 runtime requirement (and the `[...arr].sort()` / `map` shim for old runtimes).

#### Practice: real-world variant (save, then reveal)

**Prompt:** The "Kanban Card Move" reducer. A board reducer moves a card between columns and toggles a card's `done` flag. The current code mutates: `state.columns[from].splice(idx, 1); state.columns[to].push(card); card.done = true; return state`. Cards jump back to their old column on undo, and memoized `Column` components do not re-render after a move. Rewrite the reducer using copying methods, explain why returning the same `state` reference breaks React and undo, and note the one place structural sharing still helps you.

**Model answer (revealed on demand):**

Every line here mutates shared state, and the reducer returns the same `state` reference, so React's `Object.is(prev, next)` bail-out fires and nothing re-renders. Undo is broken because the history's previous entries share the very arrays and card objects you just mutated in place, so "going back" shows the mutated present.

Rewrite with copying methods so each changed level gets a new reference and untouched levels stay shared:

```js
function moveCard(state, { from, to, idx }) {
  const card = state.columns[from][idx];
  return {
    ...state,
    columns: {
      ...state.columns,
      [from]: state.columns[from].toSpliced(idx, 1),      // remove, immutably
      [to]: [...state.columns[to], { ...card, done: true }], // append updated copy
    },
  };
}
```

`toSpliced(idx, 1)` returns a new `from` array without the card and never mutates the original. The `to` column gets a new array with a fresh card object (`{ ...card, done: true }`) so the toggle does not mutate the shared card. The two untouched columns are still shared by reference through `...state.columns`.

**Why returning the same reference breaks React and undo:** React decides whether to re-render by comparing the new state reference to the old one with `Object.is`. Mutating `state` in place and returning it hands React the identical reference, so it assumes nothing changed and skips the render, even though the contents moved. Undo/redo stacks store references to previous states; if those states share mutated arrays and card objects, every history entry reflects the latest mutation, so time travel collapses.

**Where structural sharing still helps:** the two columns you did not touch are shared by reference through the top-level spread, so their memoized `Column` components see an unchanged prop and correctly skip re-rendering. You get precise re-renders (only the two affected columns update) *because* you copied only the changed branches and shared the rest, which is the entire advantage of immutable updates over a deep clone.

**Production symptom:** a Kanban board where dragging a card visually works but undo snaps it back wrong, columns that do not repaint after a move because their reference did not change, and "done" toggles that leak across history entries. It looks like a framework bug but is pure copy-and-reference semantics.

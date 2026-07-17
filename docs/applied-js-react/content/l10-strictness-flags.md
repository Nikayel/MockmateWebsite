> Module **10.5** (Strictness Flags) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [10.4](./l10-typing-props-refs.md) · Next: [10.6](./l10-real-world-types.md)

# L10 · Strictness Flags

TypeScript's default types are optimistic: they assume every array index is in range, that `Object.keys` gives back exactly the keys you declared, and that a null check survives an `await`. This module teaches you to catch the three green-typed lies that crash in production: `arr[i]` typed as present when it is `undefined`, keys widened to `string` for a reason you have to respect, and control-flow narrowing that quietly evaporates the moment an async boundary lets something mutate.

### ajr-l10-nouncheckedindexedaccess: noUncheckedIndexedAccess: arr[i] is T | undefined

- **id:** `ajr-l10-nouncheckedindexedaccess`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** js-runnable  ·  **skills:** typescript, strictness, safety

#### Learn

By default TypeScript types every indexed read as if the element is definitely there. Write `const users: User[]` and TS says `users[5]` is a `User`, full stop, even though the array has three elements and `users[5]` is `undefined` at runtime. The types are green, the code compiles, and then `users[5].name` throws `Cannot read properties of undefined (reading 'name')` in front of a customer. The type system lied to you, on purpose, for ergonomics.

`noUncheckedIndexedAccess` is the compiler flag that stops the lie. Turn it on and every index read gains `| undefined`:

```ts
// tsconfig: "noUncheckedIndexedAccess": true
const users: User[] = [a, b, c];
const u = users[5];        // now typed User | undefined
u.name;                    // COMPILE ERROR: Object is possibly 'undefined'

const dict: Record<string, User> = {};
dict["missing"].trim();    // COMPILE ERROR under the flag
```

The flag applies to three shapes: array index reads (`arr[i]`), tuple reads past a known slot, and `Record<K, V>` or index-signature reads (`dict[key]`). It does not touch reads through a known literal key on a normal object, because those are genuinely present in the type. It targets exactly the reads where the index or key is a runtime value the compiler cannot verify is in range.

The fix is to prove existence before use, and there are three clean ways:

```ts
// destructure + guard
const [first] = users;
if (first) first.name;

// .at() makes the "could be missing" explicit and readable
const last = users.at(-1);
if (last) last.name;

// optional chaining when a missing value is acceptable
dict[key]?.trim();
```

**Interview nuance:** the tempting shortcut is the non-null assertion, `users[5]!.name`. Do not. `!` tells the compiler "trust me, this is present" and erases the exact check the flag just handed you. It compiles and it still crashes at runtime, because `!` is a compile-time-only claim with zero runtime effect. A reviewer who sees `!` right after this flag was enabled should read it as an unhandled empty-data case, not a fix.

**Interview nuance:** the flag is honest about a real cost. Loops that were clean now need guards, and `for (const x of arr)` (which never produces `undefined`) is often the better rewrite than indexing. That friction is the point: it surfaces every place you assumed non-empty input.

Recap: TS types `arr[i]` and `dict[key]` as present by default, so out-of-range and missing-key reads crash despite green types; `noUncheckedIndexedAccess` adds `| undefined` to array, tuple, and Record index reads; guard with destructuring, `.at()`, or `?.`, and never paper over it with `!`.

#### See it live

**Demo (js-runnable):** `arr[5].name` on a three-element array crashes in the worker, then a guarded version reads the same slot safely, with a strict-index badge simulating what the flag would have caught.

```js
// Simulates noUncheckedIndexedAccess. By default TS types arr[i] as present;
// the flag would type it T | undefined and force a guard. JS has no such flag
// at runtime, so we show the crash the missing check causes, then the guard.
const users = [{ name: "Ada" }, { name: "Grace" }, { name: "Lin" }];

// A) UNGUARDED: what the default (non-strict) types let you write.
console.log("A) index 5 with types claiming it is present:");
try {
  const u = users[5];          // TS default: typed User (a lie)
  console.log("  strict-index badge: read users[5] with NO existence check");
  console.log("  value at users[5]:", u); // undefined at runtime
  console.log("  users[5].name ->", u.name); // throws
} catch (err) {
  console.log("  CRASH:", err.message);
}

// B) GUARDED: what the flag forces you to write.
console.log("\nB) same read, guarded (what the flag makes you do):");
const maybe = users[5];        // under the flag: User | undefined
if (maybe) {
  console.log("  users[5].name ->", maybe.name);
} else {
  console.log("  strict-index badge OK: users[5] is undefined, guard skipped it");
}

// C) the .at() idiom on a valid slot, for contrast.
const last = users.at(-1);
console.log("\nC) users.at(-1)?.name ->", last?.name);
```

**Watch:** variant A prints the strict-index badge, logs `users[5]` as `undefined`, then throws `Cannot read properties of undefined (reading 'name')`. That is the exact production crash the flag prevents. Variant B reads the same out-of-range slot but the guard sees `undefined` and skips it, so no crash. This is an honest simulation: `noUncheckedIndexedAccess` is a compile-time flag with no runtime existence in JavaScript, so the worker cannot enforce it. What the worker does show truthfully is the runtime consequence (the crash) that the flag exists to make impossible to compile.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Enable `noUncheckedIndexedAccess` conceptually and fix `const first = users[0]; first.name` and `dict[key].trim()` with guards. Say what the flag adds to each read and why reaching for `!` would defeat it.

**Think about:**
- What does the flag add to indexed reads?
- What does it catch (arrays, tuples, Record)?
- Why is silencing it with `!` an anti-pattern?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

Both reads are index reads where the compiler cannot prove the slot or key is populated, so under the flag both become `T | undefined` and both need a guard before you touch a property.

```ts
// tsconfig: "noUncheckedIndexedAccess": true

// users[0] is now User | undefined, even index 0
const first = users[0];
if (first) {
  first.name;            // safe: guarded
}
// or, shorter:
const name = users[0]?.name;   // string | undefined

// dict[key] is now User | undefined for a Record / index signature
dict[key]?.trim();       // no-op if the key is missing
// or, when you must have it, fail loudly instead of crashing on a property:
const entry = dict[key];
if (!entry) throw new Error(`missing entry for ${key}`);
entry.trim();
```

Mechanism: the flag rewrites the *type* of array, tuple, and `Record`/index-signature reads to include `| undefined`, because the index (`0`, `key`) is a value the compiler cannot line up against the actual runtime length or key set. `users[0]` is not special: an empty array makes index `0` undefined too. Before the flag, TS assumed presence and produced a `User`, which is why the unguarded property access compiled and then threw at runtime.

How to spot it in review: any `arr[i].x` or `map[key].y` with no preceding existence check, especially on data that came from a network response, a query result, or user input. The smell is a chained property access hanging directly off an index read.

Production symptom: `Cannot read properties of undefined` on empty result sets, off-by-one indices, or a key the backend stopped sending. It passes local testing (your seed data always has the row) and crashes on the first empty or partial payload in prod.

Common misconception: "`arr[i]` is always a `T`, that is what I declared." The array's *element* type is `T`; whether a given *index* is populated is a runtime fact the type system was papering over. And do not swap the guard for `!`: `users[0]!.name` compiles because `!` is erased before runtime, so it produces the identical crash while hiding the missing check from the next reviewer.

**Self-check rubric:**
- [ ] Both reads are guarded (`if`, `?.`, or an early throw) before any property access.
- [ ] I stated the flag adds `| undefined` to array, tuple, and Record/index-signature reads.
- [ ] I explained the index is a runtime value TS cannot verify is in range.
- [ ] I named the production symptom (crash on empty or partial data).
- [ ] I rejected `!` and said why (compile-time only, still crashes).

#### Practice: real-world variant (save, then reveal)

**Prompt:** Team "Metrics Pipeline" enables `noUncheckedIndexedAccess` and the build lights up in a CSV parser: `for (let i = 0; i < rows.length; i++) { const cols = rows[i].split(","); result.push({ id: cols[0].trim(), amount: Number(cols[3]) }); }`. Fix every newly flagged read and explain why the flag caught a real bug in this specific code, not just noise.

**Model answer (revealed on demand):**

Under the flag, `rows[i]` is `string | undefined` and `cols[0]` / `cols[3]` are `string | undefined`. The parser has a genuine bug: a short or malformed row makes `cols[3]` undefined, and `cols[0].trim()` throws on a blank trailing line. The flag surfaced it.

```ts
for (const row of rows) {          // for..of, so row is string, never undefined
  const cols = row.split(",");
  const id = cols[0]?.trim();      // string | undefined under the flag
  const rawAmount = cols[3];       // string | undefined
  if (!id || rawAmount === undefined) {
    continue;                      // skip malformed rows instead of crashing
  }
  const amount = Number(rawAmount);
  if (Number.isNaN(amount)) continue;
  result.push({ id, amount });
}
```

Mechanism: switching the `for` loop to `for..of` removes the `rows[i]` undefined entirely, because iteration never yields an out-of-range element. But `cols[0]` and `cols[3]` stay `string | undefined`, and correctly so: `"a,b".split(",")` has length 2, so `cols[3]` really is undefined. The flag did not invent a problem; it pointed at the exact place where a CSV with a missing column or a blank last line would have thrown.

How to spot it in review: index reads into the result of `.split()`, `.match()`, or a JSON array where the width is assumed rather than checked. Those are classic "the sample file always had four columns" bugs.

Production symptom: the pipeline runs for months, then a partner uploads a file with a trailing newline or a three-column row, and the whole batch job crashes on `cols[0].trim()` or silently writes `amount: NaN` rows. Fixing it means treating a malformed row as data to skip or reject, which the guard now makes explicit.

Misconception: "`split` on a string always gives me the columns I expect." Width is a property of the *input*, not the code, and this flag forces you to encode that uncertainty at compile time.

### ajr-l10-object-keys-string: Object.keys returns string[], not keyof

- **id:** `ajr-l10-object-keys-string`  ·  **difficulty:** hard  ·  **est:** 12 min  ·  **demo:** js-runnable  ·  **skills:** typescript, strictness, keyof

#### Learn

`Object.keys(user)` is typed as `string[]`, not `(keyof User)[]`, and every TypeScript engineer eventually fights this. It looks like a missing feature. It is actually a soundness guarantee, and the fix people reach for (`Object.keys(user) as (keyof User)[]`) is the unsafe move.

The reason is *structural, open typing*. A TypeScript type is a lower bound, not an exact shape: a value of type `User` is guaranteed to have *at least* the declared properties, but it may have more. This is legal:

```ts
type User = { id: string; name: string };

function save(u: User) { /* ... */ }

const admin = { id: "1", name: "Ada", role: "admin" }; // extra key
save(admin); // OK: admin is assignable to User (it has id and name)
```

Inside `save`, the parameter is typed `User`, but the *runtime object* has three keys. So `Object.keys(u)` at runtime returns `["id", "name", "role"]`. If TS typed that as `(keyof User)[]` it would be lying: `"role"` is not a `keyof User`. TypeScript refuses to lie, so it widens to `string[]`. `keyof User` is a *closed* set (`"id" | "name"`); the runtime key list is *open*. They cannot be soundly equated.

Now watch the cast blow up:

```ts
(Object.keys(user) as (keyof User)[]).forEach((k) => {
  const v = user[k];     // TS thinks v is string
  v.toUpperCase();       // compiles... but if k is "role" and value is a number, this can crash
});
```

The cast injects `"role"` into a variable the compiler believes is `keyof User`, and every downstream assumption about `user[k]`'s type is now built on a false premise.

The sound fixes:

```ts
// A) iterate a known literal key list you control
const KEYS = ["id", "name"] as const;
KEYS.forEach((k) => user[k].trim()); // k is "id" | "name", value type is exact

// B) validate/parse the object first so its runtime shape matches its type
const parsed = UserSchema.parse(raw); // e.g. zod strips or rejects extra keys
Object.keys(parsed).forEach((k) => { /* still string, but now the object is closed */ });

// C) if you truly own the object and know it is closed, a typed helper localizes the risk
function keysOf<T extends object>(o: T): (keyof T)[] {
  return Object.keys(o) as (keyof T)[]; // one audited place, documented as "caller guarantees no extra keys"
}
```

**Interview nuance:** the honest one-liner is "`Object.keys` returns `string[]` because objects can have more keys than their type; narrowing to `keyof` is unsound under structural typing." That single sentence signals you understand *why*, not just that the cast annoys you.

**Interview nuance:** `for...in` has the same problem plus it walks the prototype chain, so it is strictly worse than `Object.keys`. And `Object.entries` inherits the identical widening: values come back as the union of value types, not narrowed per key.

Recap: `Object.keys` returns `string[]` because structural typing lets values carry extra, undeclared keys, so the runtime key list is a superset of `keyof T`; casting `as (keyof T)[]` smuggles unknown keys into a type that claims to exclude them; iterate a literal key list or validate the shape instead.

#### See it live

**Demo (js-runnable):** an object with an extra runtime key that its type does not declare, iterated with an `as (keyof T)[]` cast and then indexed, so the unexpected key flows through as a declared type and crashes downstream.

```js
// Simulates the unsound cast Object.keys(user) as (keyof User)[].
// Type: User = { id: string; name: string }. Runtime object carries an
// extra "scores" key (a number[]), which structural typing allows.
const user = { id: "1", name: "ada", scores: [10, 20] }; // extra runtime key

// A) THE CAST: pretend every key is keyof User, so every value is a string.
console.log("A) iterate with `as (keyof User)[]` (values assumed to be strings):");
try {
  Object.keys(user).forEach((k) => {
    const v = user[k];       // compiler BELIEVES v: string
    console.log(`  key=${k}, calling v.toUpperCase()`);
    console.log("   ->", v.toUpperCase()); // scores is an array: no toUpperCase
  });
} catch (err) {
  console.log("  CRASH on the extra key:", err.message);
}

// B) SAFE: iterate a known literal key list you actually declared.
console.log("\nB) iterate a known literal key list (no extra keys leak in):");
const KEYS = ["id", "name"];
KEYS.forEach((k) => {
  console.log(`  key=${k} ->`, String(user[k]).toUpperCase());
});
```

**Watch:** variant A iterates all three runtime keys. `id` and `name` uppercase fine, then it hits `scores` (the key the *type* never mentioned) and throws `user[k].toUpperCase is not a function`, because the value is an array, not the string the cast promised. That is the extra key flowing through as a declared type and crashing downstream. Variant B iterates only the two keys you actually declared, so the undeclared `scores` never enters the loop. This is an honest simulation: TS erases the cast at compile time, so the worker runs plain JS, but the crash is exactly the runtime failure the cast sets up by lying about the value type.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Explain why `Object.keys(user).forEach(k => user[k as keyof User])` is unsound, and rewrite it two ways: a typed helper that localizes the risk, and a validated-shape approach. Reference what happens when `user` came from an API and carries an undeclared field.

**Think about:**
- Why can TS not narrow keys to `keyof`?
- What is structural (open) typing?
- When is the cast actually unsafe?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The cast is unsound because a runtime object can hold *more* keys than its declared type, so `Object.keys(user)` may include keys that are not in `keyof User`. `k as keyof User` forces the compiler to treat each key as one of the declared ones, and then `user[k]` is typed as the union of declared value types, which is wrong for any undeclared key.

```ts
// A) typed helper: keep the unsound step in ONE audited place
function keysOf<T extends object>(o: T): (keyof T)[] {
  // documented contract: caller guarantees o has no undeclared keys
  return Object.keys(o) as (keyof T)[];
}
// caller must have already closed the shape (own it, or validate it)

// B) validate first, then the runtime object matches its type
const UserSchema = z.object({ id: z.string(), name: z.string() }).strict();
const user = UserSchema.parse(raw); // .strict() rejects extra keys
Object.keys(user).forEach((k) => {
  // now the runtime key set === keyof User, so this is safe in practice
  console.log(user[k as keyof typeof user]);
});
```

Mechanism: TypeScript uses structural, open typing. A value assignable to `User` must have *at least* `id` and `name`, but nothing forbids extra keys, and passing such a value to a `User` parameter is legal. So `Object.keys` cannot be typed as `(keyof User)[]` without lying about a possible superset. It widens to `string[]` to stay sound. The `as` cast overrides that safety and tells the compiler the impossible: that the runtime key list is a subset of the declared keys.

How to spot it in review: `as keyof` (or `as (keyof T)[]`) wrapped around an `Object.keys` / `Object.entries` / `for...in` loop, especially over objects that came from `fetch`, a database row, or `JSON.parse`. Those are precisely the objects most likely to carry fields your type has not caught up to.

Production symptom: a backend adds a field (say `role` or `scores`), it flows into your loop as a supposedly-declared key, and code that assumed the declared value type crashes (`.trim is not a function`, `.toUpperCase is not a function`) or writes garbage. The type checker stayed green the whole time.

Common misconception: "`Object.keys` *should* return `keyof T`; this is a TS bug." It is deliberate. Returning `keyof T` would be unsound under structural typing. The right move is to close the shape (own it or validate it) before you rely on its key set, not to cast the uncertainty away.

**Self-check rubric:**
- [ ] I explained keys widen to `string[]` because objects can carry undeclared keys.
- [ ] I named structural / open typing as the reason.
- [ ] My helper version isolates the cast in one documented place with a stated contract.
- [ ] My validated version closes the runtime shape before iterating.
- [ ] I named the production symptom (a new API field crashing a keyed loop).

#### Practice: real-world variant (save, then reveal)

**Prompt:** Service "Audit Log" builds a diff by iterating `Object.keys(before) as (keyof Record)[]` and comparing `before[k] !== after[k]` to record changed fields. After a schema migration adds a `deletedAt` column, the audit log starts throwing and, worse, silently misreporting diffs. Explain both failures and rewrite the diff so a new column cannot break it.

**Model answer (revealed on demand):**

Two things go wrong, and both trace to the same cast. First, the migration adds `deletedAt` to the runtime rows but the `Record` type still declares the old columns, so `Object.keys(before) as (keyof Record)[]` now injects a key the type says cannot exist. Second, `before` and `after` can have *different* key sets during a rolling migration (old reads, new writes), so iterating only `before`'s keys silently misses `deletedAt` entirely, misreporting the diff.

```ts
// iterate the UNION of both objects' runtime keys, and stay honest about types
function diff(before: Record<string, unknown>, after: Record<string, unknown>) {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changed: string[] = [];
  for (const k of keys) {
    if (before[k] !== after[k]) changed.push(k); // k is string, values unknown: correct
  }
  return changed;
}
```

Mechanism: typing the maps as `Record<string, unknown>` matches reality (arbitrary runtime keys, values you must not assume the type of) and removes the false `keyof` narrowing. Using the *union* of both key sets fixes the second bug: a column present in `after` but not `before` (a newly written `deletedAt`) is now compared instead of dropped. Comparing `unknown` values with `!==` is fine because reference and primitive inequality do not need the value type.

How to spot it in review: a diff or merge that iterates one side's keys only, plus an `as keyof` cast over `Object.keys`. Any code that assumes two records share a key set is fragile across migrations and API versions.

Production symptom: post-migration the audit log throws on the undeclared key or, more dangerously, reports "no change" on a row that was soft-deleted, so the compliance trail is silently wrong. Silent wrong data is worse than the crash, and the original cast hid both from the type checker.

Misconception: "both rows are the same type, so they have the same keys." Structural typing guarantees neither exact keys nor matching key sets between two values, and during a migration they provably differ.

### ajr-l10-narrowing-loss-await: Narrowing loss across await and callbacks

- **id:** `ajr-l10-narrowing-loss-await`  ·  **difficulty:** hard  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** typescript, narrowing, async

#### Learn

TypeScript's control-flow narrowing is smart but conservative. When you write `if (state.data) { state.data.name }`, TS narrows `state.data` from `Data | null` to `Data` inside the block. But put an `await` in the middle and the narrowing is *discarded*: after the `await`, `state.data` is back to `Data | null`, and TS makes you re-check. This is not a bug. It is TS protecting you from a real race.

```ts
async function handle(state: { data: Data | null }) {
  if (state.data) {          // narrowed to Data here
    await save();            // anything could run during this await
    state.data.name;         // ERROR: Object is possibly 'null'
  }
}
```

The reason: `state.data` is a *mutable property* on an object you do not exclusively own. During the `await`, the microtask queue runs other code: an event handler, a different async task, a callback, all of which could set `state.data = null`. TS cannot prove the property still holds what you checked, so it drops the narrowing. The same discard happens across a callback boundary and after any reassignment of the checked variable.

The fix is to *capture the value in a local `const`* before the await:

```ts
async function handle(state: { data: Data | null }) {
  const data = state.data;   // snapshot the reference into a local
  if (data) {                // narrow the LOCAL, not the property
    await save();
    data.name;               // still Data: local const cannot be reassigned
  }
}
```

Local `const` narrowing *survives* the await because a `const` binding can never be reassigned, so nothing that runs during the await can invalidate the check. TS knows `data` is still `Data`. Crucially, this is not just satisfying the compiler: `const data = state.data` snapshots the *reference* at check time, so even if `state.data` is later set to null, your `data` still points at the object you validated.

**Interview nuance:** this matters most for React refs. `ref.current` is `T | null`, and the classic pattern `if (ref.current) { await fetch(); ref.current.value }` is a genuine bug, not just a type error: if the component unmounts during the fetch, React sets `ref.current = null`, and the post-await read throws `Cannot read properties of null`. TS discarding the narrowing is warning you about the exact unmount race. Hoisting to `const el = ref.current` captures the node before it can be nulled.

**Interview nuance:** the discard is per *property path*, not per variable name. A plain `const x: T | null` narrowed by `if (x)` keeps its narrowing across an await, because `x` is a `const` and cannot change. It is `obj.prop` and `arr[i]` (member accesses on mutable containers) that get reset.

Recap: TS discards property narrowing across `await`, callbacks, and reassignment because the property could have mutated in between; a local `const` snapshot narrows a binding that cannot change, so the narrowing survives and (for refs) you hold the node captured before an unmount can null it.

#### See it live

**Demo (react-demo):** a widget running `if (ref.current) { await fetch(); ref.current.value }` in a component that unmounts mid-await, then the hoisted-const version that captures the node first and survives the unmount.

The widget shows a small card with a live input whose DOM node is held in a `ref`. Two buttons: "Run (buggy)" and "Run (hoisted const)". Each runs the same sequence: read the ref, start a simulated 800ms fetch, then read the ref again after it resolves. A "Component mounted" badge (green) flips to "Unmounted" (grey) if you click "Unmount now" during the 800ms window, mirroring what React does to `ref.current` on unmount by nulling a captured `current` field on a mock ref object. A result line shows either the value read or a red `CRASH: Cannot read properties of null`. A small "narrowing" indicator shows `Data` vs `Data | null` to illustrate what the compiler would say at each step.

```tsx
const ref = useRef<HTMLInputElement>(null);

// A) buggy: re-reads ref.current after the await
async function runBuggy() {
  if (ref.current) {              // narrowed to HTMLInputElement
    await fakeFetch(800);         // user clicks "Unmount now": ref.current -> null
    setResult(ref.current.value); // ERROR under TS; CRASH at runtime if unmounted
  }
}

// B) fixed: hoist the node into a const before awaiting
async function runFixed() {
  const el = ref.current;         // capture the node now
  if (el) {
    await fakeFetch(800);         // unmount nulls ref.current, but not `el`
    setResult(el.value);          // safe: const cannot be reassigned
  }
}
```

**Watch:** click "Run (buggy)" then "Unmount now" during the 800ms window. When the fetch resolves, the buggy handler re-reads `ref.current` (now null) and the result line shows `CRASH: Cannot read properties of null`. Repeat with "Run (hoisted const)": the captured `el` still points at the node, so it reads the value cleanly even after unmount. This is an honest demo of the *runtime* race (the null re-read) that TS's narrowing discard warns about at compile time. The `Data | null` indicator is a scripted stand-in for the compiler's flow analysis, since the sandbox does not run `tsc`, but the crash it predicts is the real DOM behavior.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Fix `if (state.data) { await save(); render(state.data.name) }` that loses narrowing after the `await`, by hoisting to a `const`. Explain why TS discards the narrowing and why this is a legitimate runtime concern, not just compiler nagging.

**Think about:**
- Why is property narrowing discarded across `await`?
- Does local `const` narrowing survive?
- Why is this legitimate for refs?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The narrowing is discarded because `state.data` is a mutable property, and the `await` is a yield point where other code can run and reassign it. TS cannot prove the property still holds the non-null value you checked, so after the await it resets `state.data` to `Data | null`. Fix by snapshotting into a local `const` before the await:

```ts
async function handle(state: { data: Data | null }) {
  const data = state.data;   // snapshot the reference before yielding
  if (data) {
    await save();
    render(data.name);       // data is still Data: a const cannot be reassigned
  }
}
```

Mechanism: control-flow narrowing tracks facts the compiler can guarantee remain true along a code path. A member access like `state.data` loses its guarantee at any point where the object could mutate: an `await`, a callback invocation, or a reassignment. During `await save()`, the event loop runs queued microtasks and tasks, any of which might do `state.data = null`. A local `const data`, by contrast, is a binding that can never be reassigned, so the narrowing is sound across the await and TS keeps it. Just as important, `const data = state.data` captures the *reference value* at check time, so even a real mutation of `state.data` later cannot affect `data`.

How to spot it in review: an `x.y.z` (or `ref.current.foo`) used after an `await` where `x.y` was null-checked *before* the await, with no re-check or hoist in between. The tell is a property-path read separated from its guard by an async boundary.

Production symptom: a null re-read after the await crashes. The canonical case is React: `ref.current` was truthy, the component unmounted during the await (React nulls `ref.current`), and the post-await read throws `Cannot read properties of null`. It is intermittent, because it only fires when the unmount lands inside the await window, which is exactly why it slips through testing and surfaces under real navigation.

Common misconception: "the `if` already proved it is not null, so it stays not-null." Narrowing is a fact about a moment in the control flow, not a permanent property. An await is an explicit gap where that fact can stop being true, and TS discarding the narrowing is it modeling reality, not being pedantic.

**Self-check rubric:**
- [ ] I hoisted the value into a local `const` before the await.
- [ ] I narrowed the local, not the property, and read the local after the await.
- [ ] I explained the await is a yield point where the property can mutate.
- [ ] I stated that `const` narrowing survives because the binding cannot be reassigned.
- [ ] I named the production symptom (null re-read after await, e.g. ref nulled on unmount).

#### Practice: real-world variant (save, then reveal)

**Prompt:** Component "Live Editor" autosaves inside a debounced callback: `if (editorRef.current) { await api.save(draft); editorRef.current.focus(); toast(editorRef.current.dataset.docId) }`. In production it throws `Cannot read properties of null` a few times a day, always for users who navigate away quickly. Explain why, and rewrite it so the save still completes but the post-await DOM reads never crash.

**Model answer (revealed on demand):**

The reads crash because there is an `await api.save(draft)` between the null check and the two DOM reads, and during that await the user can navigate away, unmounting the editor and nulling `editorRef.current`. TS would flag both `.focus()` and `.dataset.docId` as possibly-null; production proves it. It only happens for fast-navigating users because the unmount has to land inside the save window.

```ts
async function autosave() {
  const editor = editorRef.current;   // capture the node before yielding
  if (!editor) return;
  const docId = editor.dataset.docId; // read sync DOM state up front too
  await api.save(draft);              // user may unmount here; editor stays captured
  if (editorRef.current) {            // re-check before RE-ENGAGING live DOM
    editor.focus();                   // safe only if still mounted; guard it
  }
  toast(docId);                       // uses the captured value, never a null read
}
```

Mechanism: hoisting `editorRef.current` into `const editor` makes the post-await reads type-safe and reference-stable, so `editor.dataset.docId` cannot throw. But there is a subtlety: `.focus()` acts on a *live* DOM node, and focusing a detached, unmounted node is pointless (and can misbehave), so for that specific side effect you also re-check `editorRef.current` to confirm the node is still mounted. The read of `dataset.docId` is captured *before* the await into `docId`, so the toast uses a value that existed at save time regardless of unmount. The save itself is never gated, so autosave still completes.

How to spot it in review: any `ref.current.something` after an await inside an async callback (debounced handlers, effect bodies, event handlers), particularly ones that fire during navigation. The pattern is a captured-then-yielded ref with live reads on the far side.

Production symptom: sporadic `Cannot read properties of null` errors correlated with route changes or fast interactions, unreproducible locally because you do not unmount mid-save by hand. The fix separates "capture stable values" (safe after await) from "touch the live DOM" (must re-check mount).

Misconception: "the ref was set, so it stays set for the whole function." Refs are nulled on unmount, and an await is exactly the window where an unmount can slip in, which is why the check and the use must be on the same side of the await, or the value must be captured across it.

> Module **10.2** (Trust Boundaries) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [10.1](./l10-discriminated-unions.md) · Next: [10.3](./l10-generics-components.md)

# L10 · Trust Boundaries

TypeScript checks the code you wrote, not the data the network hands you. Every place external data enters your app (`res.json()`, `JSON.parse`, `localStorage`, `querySelector`, `postMessage`) is a trust boundary where the compiler's guarantees quietly end. After this module you will be able to catch, in review, the four lines that turn "it compiled" into "it crashed in production three files away from the bug": an `as` on parsed data, a type guard shorter than the type it claims to prove, a double cast through `unknown`, and an `as` on a config object that should have been `satisfies`.

### ajr-l10-unknown-vs-any: unknown vs any at the trust boundary

- **id:** `ajr-l10-unknown-vs-any`  ·  **difficulty:** medium  ·  **est:** 14 min  ·  **demo:** js-runnable  ·  **skills:** typescript, unknown, validation

#### Learn

`res.json()` and `JSON.parse()` both return `any`. That single fact is the source of a whole category of production crashes. `any` is not "some type we do not know yet." `any` is "stop checking." Once a value is `any`, TypeScript lets you call any method, read any property, and assign it to any variable, all with zero errors, and the `any`-ness spreads to everything you assign it to.

Here is the trap. An API sends prices as strings (JSON has no decimal type, so money is often a string like `"12.30"`):

```ts
type Product = { name: string; price: number };

const res = await fetch('/api/product/42');
const product = (await res.json()) as Product; // cast, no check
const label = `$${product.price.toFixed(2)}`;  // compiles fine
```

This compiles cleanly. At runtime, `product.price` is the string `"12.30"`, and `"12.30".toFixed` is `undefined`, so you get `TypeError: product.price.toFixed is not a function`. The crash happens on the render line, not at the boundary where the wrong data actually entered. You will spend twenty minutes staring at `.toFixed` before you realize the API shape drifted.

The `as Product` did nothing at runtime. `as` is a compile-time promise from you to the compiler: "trust me, this is a `Product`." It emits no validation code. It is a lie you are allowed to tell.

The correct pattern is `unknown` plus validation. Type the boundary value as `unknown`, which forces you to narrow before use, then validate with a schema:

```ts
import { z } from 'zod';

const ProductSchema = z.object({
  name: z.string(),
  price: z.coerce.number(), // coerce "12.30" -> 12.30, reject "abc"
});

const raw: unknown = await res.json();
const product = ProductSchema.parse(raw); // throws AT the boundary if wrong
```

Now a shape mismatch throws a clear, located error the moment the bad data arrives, and `product` is a real `Product` because it was actually checked. `z.coerce.number()` even handles the string-money case honestly instead of pretending.

**Interview nuance:** the sharp distinction is "`any` opts out of the type system; `unknown` stays in it but forces a narrow." Both accept any value on the way in. The difference is on the way out: you can do anything with an `any` and nothing with an `unknown` until you prove what it is. A common wrong answer is "they are both escape hatches, use whichever." `unknown` is the safe escape hatch; `any` is a hole in the floor.

Recap: `.json()` and `JSON.parse` return `any`, so casting their result with `as` moves an unchecked value deep into your app where it crashes far from the boundary. Type external data as `unknown` and validate it with a schema, so failures throw at the door with a clear message.

#### See it live

**Demo (js-runnable):** fetch a product whose `price` is the string `"12.30"`, then run two variants side by side: (A) cast to a number and call `.toFixed`, (B) validate with a tiny hand-rolled schema before use.

```js
// Deterministic, dependency-free. Mock the network with setTimeout so the
// worker can run it. The server sends price as a STRING, like real JSON money.
function fetchProduct() {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ name: 'Mug', price: '12.30' }), 10); // price is a STRING
  });
}

// Tiny stand-in for a schema validator (Zod-style parse).
function parseProduct(x) {
  if (typeof x !== 'object' || x === null) throw new Error('not an object');
  if (typeof x.name !== 'string') throw new Error('name must be a string');
  const price = Number(x.price);
  if (!Number.isFinite(price)) throw new Error('price is not numeric');
  return { name: x.name, price }; // price is now a real number
}

(async () => {
  // A) cast path: `const p = raw as Product` -- no runtime check
  const raw = await fetchProduct();
  try {
    const p = raw; // pretend `as Product`: TS would be silent here
    console.log('A) cast path label:', `$${p.price.toFixed(2)}`);
  } catch (err) {
    console.log('A) cast path CRASHED:', err.message); // .toFixed is not a function
  }

  // B) validate path: unknown -> parse -> use
  try {
    const p = parseProduct(raw);
    console.log('B) validated label:', `$${p.price.toFixed(2)}`); // works: 12.30
  } catch (err) {
    console.log('B) validated path rejected cleanly:', err.message);
  }
})();
```

**Watch:** variant A logs `A) cast path CRASHED: p.price.toFixed is not a function`, because the cast let a string flow in untouched and the crash lands on the `.toFixed` call, not at the fetch. Variant B logs `B) validated label: $12.30`, because `parseProduct` coerced and checked the value at the boundary. This is a faithful runtime demo (not an approximation): the `as` in real TypeScript emits no code, so the JS here omits it too, which is exactly why A behaves as if the cast were never there.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Contrast `const u = await res.json() as User` with `const u: unknown = await res.json(); UserSchema.parse(u)`, and say why the cast is a lie. Given a `User` type with `id: number` and `email: string`, explain what each line guarantees at runtime and what happens when the API returns `{ id: "7", email: null }`.

**Think about:**
- What does `any` do that `unknown` does not?
- What does `as User` actually enforce at runtime?
- What makes external data truly match its type?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

`const u = await res.json() as User` guarantees nothing at runtime. `res.json()` returns `any`, and `as User` is a compile-time assertion that emits zero code. When the API returns `{ id: "7", email: null }`, `u.id` is the string `"7"` and `u.email` is `null`, but TypeScript believes they are `number` and `string`. The lie surfaces later: `u.id.toFixed()` throws `is not a function`, or `u.email.trim()` throws `Cannot read properties of null`, somewhere far from this line.

The corrected pattern validates:

```ts
import { z } from 'zod';

const UserSchema = z.object({
  id: z.coerce.number(),   // reject non-numeric ids
  email: z.string().email(),
});

const u: unknown = await res.json();
const user = UserSchema.parse(u); // throws HERE on { id:"7"?, email:null }
```

Mechanism: `any` disables type checking and spreads that disabling to anything it touches, so the compiler stops helping you the moment `.json()` is called. `unknown` also accepts any value but refuses every operation until you narrow it, which forces the `.parse` call. `as` changes only the static type; the runtime value is untouched. Data "truly matches its type" only when something inspected the actual bytes at runtime, which is exactly what a schema parse does and a cast does not.

How to spot it in review: search for `as SomeType` immediately after `.json()`, `JSON.parse`, `localStorage.getItem`, `sessionStorage.getItem`, or a `postMessage` handler. Those are the trust boundaries, and a cast at one is a red flag.

Production symptom: `x.toFixed is not a function` or `Cannot read properties of null`, thrown deep in a render or a formatter, with a stack trace that points nowhere near the fetch.

Common misconception: "`any` and `unknown` are interchangeable escape hatches." They accept the same inputs but differ completely on outputs. `unknown` keeps you inside the type system and forces the narrow; `any` walks you out of it.

**Self-check rubric:**
- [ ] I said `res.json()`/`JSON.parse` return `any`, and `any` spreads.
- [ ] I stated that `as` emits no runtime code.
- [ ] My fix types the value as `unknown` and validates with a schema.
- [ ] I named a concrete production symptom (`is not a function` / null deref).
- [ ] I explained the `any` vs `unknown` difference at the point of use, not just at input.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Rewrite the boundary for a Stripe-style webhook. Your `/api/webhook` route does `const event = JSON.parse(req.body) as StripeEvent` and then reads `event.data.object.amount` (expected `number`, in cents). Payloads arrive from an external system you do not control, amounts occasionally arrive as strings, and a malformed body can be a JSON array or `null`. Show why the cast is dangerous here specifically, and validate the boundary so a bad payload returns a 400 instead of a 500.

**Model answer (revealed on demand):**

The cast is worse at a webhook than almost anywhere, because the payload is fully attacker-influenced and the failure mode is a 500 (an unhandled crash) instead of a 400 (a clean rejection). `JSON.parse(req.body)` returns `any`, `as StripeEvent` asserts a deep nested shape that was never checked, and `event.data.object.amount` can be a string, missing, or the whole `event` can be `null` or an array (both valid JSON).

Validate at the boundary and branch on success:

```ts
const StripeEventSchema = z.object({
  type: z.string(),
  data: z.object({
    object: z.object({
      amount: z.coerce.number().int().nonnegative(), // cents, coerced + bounded
    }),
  }),
});

let parsed: unknown;
try {
  parsed = JSON.parse(req.body);
} catch {
  return res.status(400).json({ error: 'invalid JSON' });
}

const result = StripeEventSchema.safeParse(parsed);
if (!result.success) {
  return res.status(400).json({ error: 'invalid webhook shape' });
}
const event = result.data; // fully checked; amount is a real number
```

Mechanism: `safeParse` returns a discriminated result instead of throwing, which fits a route handler that must translate bad input into a 400. `JSON.parse` itself can throw on non-JSON bodies, so it needs its own try/catch before the schema even runs. Two boundaries, two guards.

How to spot it in review: any `JSON.parse(...) as T` in a route handler, and any deep property access (`a.b.c.d`) on a value that came from `req.body` without a validation step between. Production symptom of the un-fixed version: intermittent 500s and paging alerts whenever an upstream ships a schema change or a fuzzer hits the endpoint, with the stack landing on `.amount` access. Misconception to correct: "the webhook is signed, so the body is safe." A valid signature proves the sender, not the shape; the payload schema can still drift.

### ajr-l10-type-guards-unsound: User-defined type guards are unsound

- **id:** `ajr-l10-type-guards-unsound`  ·  **difficulty:** hard  ·  **est:** 12 min  ·  **demo:** js-runnable  ·  **skills:** typescript, type-guards, validation

#### Learn

A user-defined type guard is a function whose return type is a type predicate, `x is T`. When it returns `true`, TypeScript narrows the argument to `T` for the rest of the block. The critical thing to understand: TypeScript does not verify that the function body actually proves `T`. It trusts your predicate. The `is T` is an assertion you make, and the compiler takes your word for it.

That makes a lazy guard a silent lie:

```ts
type User = { id: number; name: string; email: string };

const isUser = (x: any): x is User => !!x && 'id' in x; // checks ONLY id

const raw: unknown = { id: 1 }; // no name, no email
if (isUser(raw)) {
  console.log(raw.name.toUpperCase()); // TS is sure `name` exists
}
```

TypeScript sees `isUser(raw)` return `true`, narrows `raw` to `User`, and lets you call `raw.name.toUpperCase()` with full confidence. At runtime `raw.name` is `undefined`, and `undefined.toUpperCase()` throws `Cannot read properties of undefined (reading 'toUpperCase')`. The guard promised three fields and checked one. The compiler never noticed, because it does not read the body to confirm the predicate; it just trusts the signature.

There are two robust fixes. First, check every field the type claims:

```ts
const isUser = (x: unknown): x is User =>
  typeof x === 'object' && x !== null &&
  typeof (x as any).id === 'number' &&
  typeof (x as any).name === 'string' &&
  typeof (x as any).email === 'string';
```

Second, and better, derive the guard from a schema so there is a single source of truth and the guard cannot drift from the type:

```ts
const UserSchema = z.object({ id: z.number(), name: z.string(), email: z.string() });
type User = z.infer<typeof UserSchema>;
const isUser = (x: unknown): x is User => UserSchema.safeParse(x).success;
```

Now the type and the check come from one definition; add a field to the schema and both update together.

**Interview nuance:** TypeScript 5.5 added inferred type predicates, so `arr.filter(x => x != null)` can now narrow to remove `null` without you writing `x is T` by hand. That is real and useful, but it only infers predicates the compiler can prove from simple expressions. It does not make your hand-written guards sound. A hand-written `x is User` is still trusted, not verified. Do not let "5.5 infers predicates now" lull you into thinking guard bodies are checked; the inference covers narrow cases the compiler is certain about, and your custom guard is not one of them.

Recap: a type predicate `x is T` is asserted by you and trusted by the compiler, never checked against the function body, so a guard that inspects fewer fields than `T` narrows bad objects and crashes downstream. Check every field, or derive the guard from a schema so it stays honest.

#### See it live

**Demo (js-runnable):** feed a malformed object `{ id: 1 }` to a shallow guard that checks only `id`, then to a thorough guard that checks every field, and try to use `.name.toUpperCase()` after each.

```js
// Deterministic, dependency-free. In JS the `x is User` predicate is just a
// boolean return; we show that a shallow guard returns true for bad data.
function isUserShallow(x) {
  return !!x && 'id' in x; // checks ONLY id (the lazy guard)
}

function isUserThorough(x) {
  return (
    typeof x === 'object' && x !== null &&
    typeof x.id === 'number' &&
    typeof x.name === 'string' &&
    typeof x.email === 'string'
  );
}

const bad = { id: 1 }; // missing name and email

// A) shallow guard: passes the bad object, then the code crashes downstream
console.log('A) isUserShallow(bad):', isUserShallow(bad)); // true (the lie)
try {
  if (isUserShallow(bad)) {
    console.log('A) name upper:', bad.name.toUpperCase()); // crashes
  }
} catch (err) {
  console.log('A) crashed downstream:', err.message);
}

// B) thorough guard: rejects the bad object at the boundary
console.log('B) isUserThorough(bad):', isUserThorough(bad)); // false
if (isUserThorough(bad)) {
  console.log('B) name upper:', bad.name.toUpperCase());
} else {
  console.log('B) rejected at the boundary, no downstream crash');
}
```

**Watch:** variant A logs `true` from the shallow guard and then `A) crashed downstream: Cannot read properties of undefined (reading 'toUpperCase')`, proving the guard admitted a bad object and the crash landed on the usage line. Variant B logs `false` and stops cleanly. This is an honest runtime demo of the same divergence you would see in typed code: the JS booleans here mirror exactly what the `x is User` predicate returns, and in TypeScript variant A would additionally compile without complaint, which is what makes it dangerous.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Show `const isUser = (x:any): x is User => !!x && "id" in x` passing `{id:1}` (missing `name`) and then crashing on `user.name`, and fix it. Walk through what TypeScript believes after the guard returns true, where the runtime crash actually happens, and rewrite the guard so it cannot lie.

**Think about:**
- Does TS verify the predicate body?
- What does TS 5.5 auto-infer for some filters?
- Why prefer schema-derived guards?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

After `isUser({ id: 1 })` returns `true`, TypeScript narrows the value to `User` and treats `user.name` as a guaranteed `string`. It does this because a type predicate `x is T` is trusted, not verified: the compiler never reads the guard body to confirm it actually checks `name`. At runtime `user.name` is `undefined`, so `user.name.toUpperCase()` throws `Cannot read properties of undefined (reading 'toUpperCase')`, on the usage line, not inside the guard.

Corrected, schema-derived guard:

```ts
const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
});
type User = z.infer<typeof UserSchema>;

const isUser = (x: unknown): x is User => UserSchema.safeParse(x).success;

const raw: unknown = { id: 1 };
if (isUser(raw)) {
  raw.name.toUpperCase(); // only reached when name really is a string
} else {
  // handle the invalid shape explicitly
}
```

Mechanism: the `is` predicate is an assertion the compiler propagates; it is not checked against the body, so the guard is only as sound as the fields it inspects. Deriving it from a schema gives you one source of truth (`z.infer` produces the type, `safeParse` produces the check), so the guard cannot drift out of sync with `User`.

How to spot it in review: a type predicate whose body is visibly shorter than the type it claims to prove. If the return type mentions five fields and the body touches one, the guard is unsound. `in` checks and truthiness checks are the usual tells.

Production symptom: a missing or wrong-typed field is dereferenced and crashes at runtime, typically `Cannot read properties of undefined`, with the guard call in the stack but the guard itself looking innocent.

Common misconception: "a `x is T` guard is compiler-verified, so if it type-checks the narrowing is safe." It is not verified. Also do not confuse this with TypeScript 5.5 inferred predicates: `filter(x => x != null)` can now narrow automatically, but that inference only covers simple expressions the compiler can prove, and it does nothing to make a hand-written multi-field guard sound.

**Self-check rubric:**
- [ ] I stated TS trusts the predicate signature and does not verify the body.
- [ ] I identified the crash on the usage line, not inside the guard.
- [ ] My fix checks every field or derives the guard from a schema.
- [ ] I mentioned TS 5.5 inferred predicates without overclaiming what they cover.
- [ ] I named the runtime symptom (`Cannot read properties of undefined`).

#### Practice: real-world variant (save, then reveal)

**Prompt:** Audit a feature-flag gate. A team ships `const isAdmin = (u: any): u is Admin => u?.role === 'admin'` and gates a delete-account button behind `if (isAdmin(user)) show(...)`, where `Admin` also requires `permissions: string[]`. The UI later calls `user.permissions.includes('delete')`. Explain the security-flavored failure and rewrite the guard so it cannot admit an under-specified admin.

**Model answer (revealed on demand):**

The guard checks `role === 'admin'` but the `Admin` type also requires `permissions: string[]`. Any object with `{ role: 'admin' }` and no `permissions` narrows to `Admin`, so `user.permissions.includes('delete')` throws `Cannot read properties of undefined (reading 'includes')`. In a security-adjacent gate this is worse than a normal crash: depending on how the surrounding code handles the throw, you can end up with an admin UI half-rendered, or an error boundary that swallows the failure and leaves a destructive control in an ambiguous state. Trusting a one-field guard for an authorization decision is the core mistake.

Sound, schema-derived version:

```ts
const AdminSchema = z.object({
  role: z.literal('admin'),
  permissions: z.array(z.string()),
});
type Admin = z.infer<typeof AdminSchema>;

const isAdmin = (u: unknown): u is Admin => AdminSchema.safeParse(u).success;

if (isAdmin(user) && user.permissions.includes('delete')) {
  showDeleteButton();
}
```

Mechanism: the predicate now returns `true` only when `role` is exactly `'admin'` and `permissions` is really a string array, because `safeParse` inspects both. The literal `z.literal('admin')` also stops a stray `role: 'administrator'` from slipping through.

How to spot it in review: any guard used for gating (auth, feature flags, entitlements) whose body checks fewer fields than the gated code reads. Grep for `u.role ===` next to a predicate return. Production symptom of the un-fixed version: crashes on `permissions.includes`, plus the deeper risk that authorization is being decided by an untrusted, under-checked shape. Misconception to correct: "the guard is fine because real admins always have permissions." The guard's job is to reject the objects that do not, and this one does not do that job. And to be clear, a client-side guard is a UX gate, not a security control; the server must independently re-check authorization on the delete request itself.

### ajr-l10-as-casts-hide-bugs: as assertions and double casts hide runtime bugs

- **id:** `ajr-l10-as-casts-hide-bugs`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** js-runnable  ·  **skills:** typescript, casts, safety

#### Learn

`as` changes the type, never the value. It tells the compiler "treat this expression as type `T` from here on" and emits no runtime code to make that true. So `as` moves crashes downstream: the value is whatever it always was, but the compiler stops warning you about it, so the failure surfaces wherever you finally touch the value in a way the real value cannot support.

The classic DOM example erases a `| null`:

```ts
const btn = document.querySelector('.btn') as HTMLButtonElement;
btn.click(); // compiles; throws if .btn is not in the DOM
```

`querySelector` returns `Element | null`. The `as HTMLButtonElement` erases both the `null` and the "might be a plain `Element`, not a button." If `.btn` is missing (a typo, a not-yet-mounted node, a conditionally rendered element), `btn` is `null` and `btn.click()` throws `Cannot read properties of null (reading 'click')`. The cast deleted the exact check that would have caught it.

Worse is the double cast, `as unknown as T`. Normally `as` refuses casts between types with no overlap (`Foo as Bar` errors if they cannot possibly be the same). Routing through `unknown` defeats that last guard, because everything is assignable to and from `unknown`:

```ts
const apiResp = await res.json();
const user = apiResp as unknown as User; // silences the overlap error
```

This is the compiler's strongest "these types are unrelated" warning, switched off by hand. It is occasionally necessary (bridging genuinely incompatible library types), but at a trust boundary it is almost always a mistake, because it launders unvalidated data straight into a trusted type.

The fixes: narrow with a guard, or validate. Reserve `as` for the few cases where it is honest: a DOM lookup you have actually verified is present, `as const` for literal narrowing, and typing test mocks.

```ts
const btn = document.querySelector('.btn');
if (btn instanceof HTMLButtonElement) {
  btn.click(); // narrowed by a real runtime check
}
```

**Interview nuance:** the crisp line is "`as` is a compile-time reinterpretation, not a runtime conversion." A frequent wrong belief is "`as` is just a hint, like a comment." It is stronger than a hint: it actively overrides the compiler's judgment and suppresses errors that would otherwise fire. That is why `as` density is a code-smell metric. A file with many casts, especially `as unknown as`, is a file where the type system has been told to stop looking, and bugs collect exactly there.

Recap: `as` changes only the static type and emits no code, so a cast that erases `| null` compiles and then crashes downstream on the real `null`, and `as unknown as T` disables even the overlap guard. Narrow with `instanceof`/guards or validate, and keep `as` for verified DOM lookups, `as const`, and test mocks.

#### See it live

**Demo (js-runnable):** simulate `querySelector` returning `null`, "cast" it (a no-op in JS, exactly as in TS), call `.click()`, and count `as unknown as` occurrences as an as-density signal. Then show the narrowed variant.

```js
// Deterministic, dependency-free. Mock querySelector returning null (element
// absent). In TS, `as HTMLButtonElement` would compile; in JS it is a no-op,
// which is the whole point: the cast changes nothing at runtime.
function querySelector(sel) {
  return null; // .btn is not in the DOM this render
}

// A) cast path: pretend `querySelector('.btn') as HTMLButtonElement`
try {
  const btn = querySelector('.btn'); // "as HTMLButtonElement" erased the | null
  btn.click(); // crashes: btn is null
  console.log('A) clicked');
} catch (err) {
  console.log('A) cast path CRASHED:', err.message);
}

// B) narrowed path: check before use
const maybeBtn = querySelector('.btn');
if (maybeBtn && typeof maybeBtn.click === 'function') {
  maybeBtn.click();
  console.log('B) clicked');
} else {
  console.log('B) element absent, skipped safely (no crash)');
}

// as-density counter: scan sample source for the double-cast smell
const sampleSource = `
  const a = resp as unknown as User;
  const b = node as HTMLButtonElement;
  const c = payload as unknown as Order;
`;
const doubleCasts = (sampleSource.match(/as unknown as/g) || []).length;
const totalCasts = (sampleSource.match(/\bas\b/g) || []).length;
console.log('as-density: total `as` =', totalCasts, '| `as unknown as` =', doubleCasts);
console.log('the two `as unknown as` lines are the ones to flag red.');
```

**Watch:** variant A logs `A) cast path CRASHED: Cannot read properties of null (reading 'click')`, because the "cast" erased the `| null` and the real value was `null`. Variant B logs `B) element absent, skipped safely (no crash)`, because the `instanceof`/truthiness check ran at runtime. The counter logs `total as = 4 | as unknown as = 2`, flagging the two double casts. This is an honest demo: `as` genuinely compiles to nothing, so the JS omitting it reproduces the real behavior exactly, and the counter mirrors what a lint rule (`@typescript-eslint/consistent-type-assertions`) would surface.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Replace `document.querySelector(".btn") as HTMLButtonElement` and `apiResp as unknown as User` with a guard or `satisfies`, and say what the cast erased. For each line, state the type before the cast, what the cast suppressed, and the runtime value that will eventually break it.

**Think about:**
- What does `as` change: the type or the value?
- What does `as unknown as T` defeat?
- What null check did the cast erase?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

`querySelector('.btn')` has type `Element | null`. The `as HTMLButtonElement` erased both the `null` branch and the widening from `Element` to the specific button subtype. If `.btn` is absent, the runtime value is `null` and `btn.click()` throws `Cannot read properties of null`. `apiResp` is `any` from `res.json()`; `as unknown as User` first launders it through `unknown` to defeat the overlap check, then asserts `User`, so unvalidated network data becomes a "trusted" `User` with zero runtime evidence.

Corrected:

```ts
// DOM: narrow with a real runtime check
const el = document.querySelector('.btn');
if (el instanceof HTMLButtonElement) {
  el.click();
}

// API: validate at the boundary
const raw: unknown = await res.json();
const user = UserSchema.parse(raw); // throws here if the shape is wrong
```

Mechanism: `as` changes only the static type; the runtime value is untouched, so the crash moves downstream to wherever the real value cannot support the operation. `as unknown as T` defeats the assignability/overlap guard that normally blocks casts between unrelated types, because every type is assignable to and from `unknown`. That guard is your last automatic protection against nonsense casts, and the double cast turns it off.

How to spot it in review: `as` density, and specifically `as unknown as` at or near a trust boundary (`.json()`, `querySelector`, `getElementById`, `JSON.parse`). A single `as unknown as` in a data path is worth a comment thread.

Production symptom: code that compiled cleanly then throws `Cannot read properties of null` or `is not a function` far from the cast site, so the stack trace points at the usage, not the cast.

Common misconception: "`as` is just a hint." It is not; it overrides the compiler and suppresses the exact errors that would have caught the bug. Reserve `as` for verified DOM lookups you have already null-checked, `as const`, and test mocks.

**Self-check rubric:**
- [ ] I gave the pre-cast type of each expression (`Element | null`, `any`).
- [ ] I said `as` changes the type, not the value, and emits no code.
- [ ] I explained that `as unknown as T` defeats the overlap guard.
- [ ] My DOM fix uses `instanceof` (or a real null check) and my API fix validates.
- [ ] I named the downstream symptom and where the stack points.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Clean up a legacy adapter. A payments module has `const charge = gatewayResponse as unknown as Charge` and, 40 lines later, `charge.amount.toFixed(2)` plus `charge.card.last4`. The gateway SDK's response type genuinely does not match your internal `Charge`, which is why someone reached for the double cast. Keep the code compiling but make it safe, and explain the trade-off you are making versus the original.

**Model answer (revealed on demand):**

The double cast exists because the SDK type and your `Charge` are genuinely different shapes, so a plain `as Charge` errors and someone silenced it with `as unknown as Charge`. The cost is that nothing checks the mapping: if the SDK renames `amount` to `amountCents` or nests `card`, the code still compiles and then throws `Cannot read properties of undefined` on `charge.card.last4` in production, during a payment.

Make the boundary explicit with a validated adapter instead of a cast:

```ts
const GatewayChargeSchema = z.object({
  amount_cents: z.number(),
  source: z.object({ last4: z.string() }),
});

function toCharge(raw: unknown): Charge {
  const g = GatewayChargeSchema.parse(raw); // throws at the boundary if the SDK drifts
  return {
    amount: g.amount_cents / 100,
    card: { last4: g.source.last4 },
  };
}

const charge = toCharge(gatewayResponse);
charge.amount.toFixed(2);
charge.card.last4;
```

Mechanism: the schema validates the SDK's actual shape, and the adapter function does the real field-by-field mapping that the double cast pretended did not need to exist. The type gap is now bridged by code that runs, not by an assertion that does not.

Trade-off versus the original: you write and maintain an explicit mapping and pay a small validation cost per charge, in exchange for the drift being caught at the boundary with a clear error instead of surfacing as a mid-payment crash 40 lines later. How to spot the original in review: `as unknown as` on a third-party SDK response that is then deep-accessed. Production symptom of leaving it: silent breakage on the next SDK upgrade, discovered by a failed charge rather than a test. Misconception to correct: "the double cast is fine because the SDK types are close enough." Close enough is exactly the case that drifts; if the shapes really differ, you need a mapping, and a mapping is code, not a cast.

### ajr-l10-satisfies-operator: satisfies vs as vs annotation

- **id:** `ajr-l10-satisfies-operator`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** typescript, satisfies, config

#### Learn

Three tools attach a type to a value, and they behave very differently. An annotation (`const x: T = ...`) widens the value to `T`, so you lose the specific literal information. `as` (`... as T`) overrides the compiler and can even hide mistakes. `satisfies` (`... satisfies T`) checks that the value conforms to `T` but keeps the value's narrow, inferred type, so you get validation without widening.

Consider a routes config:

```ts
// A) annotation: widens keys/values to string, loses literal keys
const routesA: Record<string, string> = { home: '/', about: '/about' };
routesA.hom; // NO error: any string key is allowed; typos slip through

// B) as: overrides, and can accept a bogus shape
const routesB = { home: '/', about: 42 } as Record<string, string>; // 42 is wrong, but...
// as will error on 42 here, but as on object literals also lets you assert
// shapes that are not true, and it kills exact-key autocomplete either way.

// C) satisfies: validates against the type, keeps exact keys
const routesC = { home: '/', about: '/about' } satisfies Record<string, string>;
routesC.hom; // ERROR: Property 'hom' does not exist. Typo caught.
routesC.home.toUpperCase(); // string methods available, exact keys autocomplete
```

The key difference: after `satisfies`, `routesC` still has the literal type `{ home: string; about: string }`, so accessing `routesC.hom` is a compile error and your editor autocompletes `home`/`about`. After the annotation, `routesA` is `Record<string, string>`, so `routesA.anything` is allowed and typos pass silently. `satisfies` gives you the constraint check of an annotation and the precision of no annotation at once.

Pair it with `as const` when you also want the values narrowed to their literals and made readonly:

```ts
const config = {
  env: 'production',
  retries: 3,
} as const satisfies { env: 'production' | 'staging'; retries: number };
// config.env has type 'production' (not string), and the object is readonly
```

`as const` freezes the literals; `satisfies` checks them against the constraint. Neither widens.

**Interview nuance:** the sharp framing is "`satisfies` validates without widening." A common wrong answer is "`as` and `satisfies` do the same thing, one is just newer." They are opposites in intent: `as` tells the compiler to stop checking and accept your claim, while `satisfies` asks the compiler to check your value and then get out of the way, preserving the inferred type. `as` on an object literal you own is almost always a `satisfies` waiting to happen.

Recap: annotations widen and let bad keys through, `as` overrides and can accept a bogus shape while killing exact-key autocomplete, and `satisfies` validates the value against a type while keeping its narrow inferred type so typos error and exact keys autocomplete. Reach for `satisfies` (optionally with `as const`) on config objects you control.

#### See it live

**Demo (react-demo):** a three-tab widget titled "How the value is typed." Each tab shows the same `routes` object declared with `as`, `satisfies`, or an annotation. The learner clicks a tab, then hovers (or clicks) a "Show inferred type" toggle that reveals the type the compiler infers for that declaration, and a live "access `routes.hom`" line that renders a red error badge or a green ok badge. A small counter shows "exact-key autocomplete: kept / lost" for each variant.

```tsx
type RoutesConfig = Record<string, string>;

const routesAnnotation: RoutesConfig = { home: '/', about: '/about' };
// inferred type: Record<string, string>  -> routes.hom is allowed (typo slips)

const routesAs = { home: '/', about: '/about' } as RoutesConfig;
// inferred type: Record<string, string>  -> exact-key autocomplete lost

const routesSatisfies = { home: '/', about: '/about' } satisfies RoutesConfig;
// inferred type: { home: string; about: string } -> routes.hom ERRORS, autocomplete kept

function TypingDemo({ variant }: { variant: 'annotation' | 'as' | 'satisfies' }) {
  const inferred = {
    annotation: 'Record<string, string>',
    as: 'Record<string, string>',
    satisfies: '{ home: string; about: string }',
  }[variant];
  const homTypoIsError = variant === 'satisfies';
  return (
    <div>
      <p>Inferred type: <code>{inferred}</code></p>
      <p>
        Access <code>routes.hom</code>:{' '}
        {homTypoIsError
          ? <span className="badge-red">compile error (typo caught)</span>
          : <span className="badge-yellow">allowed (typo slips through)</span>}
      </p>
      <p>Exact-key autocomplete: {homTypoIsError ? 'kept' : 'lost'}</p>
    </div>
  );
}
```

**Watch:** switching to the `annotation` and `as` tabs shows the inferred type collapse to `Record<string, string>`, the `routes.hom` line turn yellow ("allowed, typo slips through"), and autocomplete report "lost"; the `satisfies` tab shows the inferred type stay `{ home: string; about: string }`, the `routes.hom` line turn red ("compile error"), and autocomplete "kept." Honesty note: this is an illustration of a compile-time behavior, not a live type check. Real TypeScript inference happens in your editor and `tsc`, not in the browser, so the widget hard-codes the outcomes that `tsc` produces for each declaration rather than computing them live. The values shown are exactly what the compiler emits; the widget just visualizes them.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Rewrite `const routes = {...} as Record<string,string>` with `satisfies` so bad keys error and exact keys autocomplete, and explain the difference. Use a routes object with keys `home`, `about`, `contact`, and describe what changes about the inferred type and about accessing a mistyped key like `routes.conatct`.

**Think about:**
- What does `satisfies` keep that `as`/annotation lose?
- When do you pair it with `as const`?
- What does `as` on an object disable?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

Corrected:

```ts
const routes = {
  home: '/',
  about: '/about',
  contact: '/contact',
} satisfies Record<string, string>;

routes.contact;  // ok, autocompletes
routes.conatct;  // ERROR: Property 'conatct' does not exist on type '{ home: ...; about: ...; contact: ... }'
```

Mechanism: `satisfies` checks the value against `Record<string, string>` (so a non-string value like `about: 42` would still error) but does not widen the value. The inferred type of `routes` stays `{ home: string; about: string; contact: string }`, the exact literal keys. That is why `routes.conatct` is a compile error and your editor autocompletes only `home`/`about`/`contact`. With `as Record<string, string>` (or the annotation), `routes` widens to `Record<string, string>`, so every string key is considered valid, `routes.conatct` compiles, and autocomplete offers nothing useful.

Pair `satisfies` with `as const` when you also want the values narrowed to literals and made readonly, for example `{ ... } as const satisfies Record<string, string>`, which is what you want for a frozen config where `routes.home` should have type `'/'` rather than `string`.

How to spot it in review: `as SomeType` on an object literal you control (a config, a routes map, a theme, a lookup table). That is almost always a `satisfies` waiting to happen, because on a literal you own you want validation plus precision, not an override.

Production symptom (of the fixed version, stated as the win): typo keys and missing keys are caught at compile time, and precise autocomplete is kept, so a mistyped route reference fails the build instead of returning `undefined` and routing the user nowhere at runtime.

Common misconception: "`as` validates like `satisfies`." It does not. `as` overrides the compiler and, on an object literal, discards the exact-key inference; `satisfies` validates and preserves it. They point in opposite directions.

**Self-check rubric:**
- [ ] My rewrite uses `satisfies Record<string, string>`.
- [ ] I said `satisfies` validates without widening and keeps literal keys.
- [ ] I showed the mistyped key erroring under `satisfies` but not under `as`/annotation.
- [ ] I said when to add `as const` (freeze literals + readonly).
- [ ] I corrected the "`as` validates like `satisfies`" misconception.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Harden a design-token theme. A team ships `const theme = { colors: { primary: '#0af', danger: '#f33' }, spacing: { sm: 4, md: 8 } } as Theme`, and components read `theme.colors.primaery` (typo) and `theme.spacing.lg` (missing). Both currently compile. Rewrite the declaration so typos and missing keys fail the build while keeping exact-key autocomplete and literal color values, and explain what `as` was hiding.

**Model answer (revealed on demand):**

The `as Theme` widens the object to `Theme` and, more importantly, overrides the compiler: it accepts the literal as long as it is assignable-ish to `Theme`, discards the precise inferred key set, and gives you `Theme`'s (likely index-signature or broad) shape for access. If `Theme` is defined with index signatures like `colors: Record<string, string>`, then `theme.colors.primaery` and `theme.spacing.lg` both compile and return `undefined` at runtime, so a component renders with an undefined color or spacing and you get an invisible or broken layout with no build error.

Rewrite with `as const satisfies`:

```ts
const theme = {
  colors: { primary: '#0af', danger: '#f33' },
  spacing: { sm: 4, md: 8 },
} as const satisfies {
  colors: Record<string, string>;
  spacing: Record<string, number>;
};

theme.colors.primary;  // type '#0af', autocompletes
theme.colors.primaery; // ERROR: does not exist
theme.spacing.lg;      // ERROR: does not exist
```

Mechanism: `satisfies` validates the object against the constraint (colors are strings, spacing are numbers) without widening, so `theme` keeps its exact inferred keys and every typo or missing key is a compile error. `as const` additionally narrows `primary` to the literal `'#0af'` and makes the object readonly, which is what you want for tokens that must not be mutated and that you may want to switch on by literal value.

How to spot the original in review: `as SomeInterface` on a theme/token/config literal, especially when the interface uses `Record`/index signatures, because that combination is what lets typos through. Production symptom of leaving it: components silently render with `undefined` styles (missing color, collapsed spacing), a class of bug that never trips a type error and only shows up as a visual defect in QA or production. Misconception to correct: "`as Theme` guarantees the object matches `Theme`." It asserts assignability and then hands you `Theme`'s access shape; with index signatures that shape permits any key, so it guarantees far less than `satisfies`, which checks the literal and keeps it exact.

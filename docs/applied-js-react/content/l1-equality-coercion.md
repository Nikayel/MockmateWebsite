> Module **1.4** (Equality & Coercion) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [1.3](./l1-this-binding.md) · Next: [1.5](./l1-hoisting-tdz.md)

# L1 · Equality & Coercion

After this module you will catch the equality bugs that pass code review because they look correct: a validation guard that compares against `false` and quietly rejects real input, and a cache lookup that uses `===` and can never find a `NaN` key. You will know exactly which of JavaScript's three equality regimes (`===`, `Object.is`, and the `SameValueZero` used by `includes`/`Map`/`Set`) to reach for, and why they disagree on `NaN` and `-0`.

### ajr-l1-eqeq-vs-eqeqeq: loose vs strict equality and the == null idiom

- **id:** `ajr-l1-eqeq-vs-eqeqeq`  ·  **difficulty:** easy  ·  **est:** 12 min  ·  **demo:** js-runnable  ·  **skills:** equality, coercion

#### Learn

`===` (strict equality) is the boring, predictable one: if the two operands are different types, the answer is `false`, full stop. No conversion happens. `==` (loose equality) is the interesting and dangerous one: when the types differ, it runs the Abstract Equality algorithm, which coerces operands (usually via `ToNumber`, and `ToPrimitive` for objects) until they share a type, and only then compares. That coercion step is where the surprises live.

Walk through the classic guard bug. You want to reject a form that was left blank, so you write:

```js
function reject(userInput) {
  if (userInput == false) return "rejected";
  return "accepted";
}
```

`== false` does not mean "falsy". It means "loosely equal to the boolean `false`". The algorithm converts `false` to the number `0`, then converts the other side to a number too. So `0 == false`, `"" == false`, `"0" == false`, and `[] == false` are all `true` (an empty array stringifies to `""`, which becomes `0`). Meanwhile `null == false` is `false` and `undefined == false` is `false`, because `null` and `undefined` are deliberately excluded from numeric coercion in this algorithm. So the guard rejects the number `0`, the string `"0"`, and an empty array, but accepts `null` and `undefined`. That is almost exactly backwards from what a validator wants.

There is one loose comparison you should actually use: `x == null`. It is `true` for exactly `null` and `undefined` and nothing else, so it is the concise nullish check. `x == null` is equivalent to `x === null || x === undefined`. This is the single sanctioned `==` in most style guides (including Airbnb's, via an eqeqeq exception).

**Interview nuance:** `==` is not transitive. `0 == "0"` is `true` (both go to number `0`) and `0 == ""` is `true` (empty string is `0`), but `"0" == ""` is `false` because now both sides are already strings, so no numeric coercion happens and `"0"` is compared to `""` as text. Same values, different path, different answer. That non-transitivity is the tell that `==` is comparing *coerced* values, not the values you wrote.

Rule of thumb: use `===` and `!==` everywhere, and use `x == null` (or the modern `x ?? default` and `x?.foo`) for nullish checks. Reserve `==` for that one idiom and nothing else.

Recap: `===` never coerces and is safe by default; `==` runs Abstract Equality with `ToNumber`/`ToPrimitive` coercion, which makes `0`/`""`/`"0"`/`[]` all loosely equal to `false`; the only `==` worth keeping is `x == null`.

#### See it live

**Demo (js-runnable):** logs a comparison grid of `0, "", "0", false, null, undefined, NaN, []` against each other under both `==` and `===`, so you can see which cells light up.

```js
// A) loose equality (==): coerces across types
// B) strict equality (===): same type required, stays on the diagonal
const values = [0, "", "0", false, null, undefined, NaN, []];
const label = (v) =>
  Number.isNaN(v) ? "NaN"
  : Array.isArray(v) ? "[]"
  : JSON.stringify(v);

function grid(op, fn) {
  console.log(`\n=== ${op} truthy pairs (excluding self-diagonal) ===`);
  let hits = 0;
  for (let i = 0; i < values.length; i++) {
    for (let j = 0; j < values.length; j++) {
      if (i === j) continue;
      if (fn(values[i], values[j])) {
        console.log(`${label(values[i])} ${op} ${label(values[j])}  -> true`);
        hits++;
      }
    }
  }
  console.log(`total off-diagonal true cells: ${hits}`);
}

grid("==", (a, b) => a == b);   // A) many cross-type cells fire
grid("===", (a, b) => a === b); // B) almost none (only "0"/"0" style same-type)

console.log("\n--- the guard bug ---");
for (const v of [0, "", "0", false, null, undefined, []]) {
  console.log(`${label(v)} == false -> ${v == false}`);
}

console.log("\n--- the one good == ---");
console.log(`null == undefined -> ${null == undefined}`);   // true
console.log(`null === undefined -> ${null === undefined}`); // false
console.log(`0 == null -> ${0 == null}`);                   // false (safe)
```

**Watch:** the `==` grid prints a cluster of off-diagonal `true` cells (`0`/`false`/`""`/`"0"`/`[]` all cross-linking), while the `===` grid stays essentially on its own diagonal. The guard block shows `0`, `""`, `"0"`, and `[]` each returning `true` for `== false` (so they get rejected) while `null` and `undefined` return `false`. The last block proves the asymmetry the idiom relies on: `null == undefined` is `true` but `null === undefined` is `false`, and `0 == null` is `false`.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Predict the results of `0 == false`, `"" == false`, `"0" == false`, `[] == false`, `null == false`, and `undefined == false`, then rewrite `if (userInput == false) reject()` so the guard rejects only genuinely empty or missing input. Explain why the original rejected the wrong things.

**Think about:**
- What does `==` do that `===` does not?
- Which single `==` usage is idiomatic and safe?
- Why is `==` non-transitive (`0 == "0"` but `"" != "0"`)?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

Predictions: `0 == false` -> `true`, `"" == false` -> `true`, `"0" == false` -> `true`, `[] == false` -> `true`, `null == false` -> `false`, `undefined == false` -> `false`.

The original guard is wrong because `== false` does not test truthiness. Abstract Equality converts `false` to the number `0`, then coerces the left side to a number as well: `""` and `[]` become `""` then `0`, `"0"` becomes `0`, and `0` is already `0`, so all four are "equal to false" and get rejected. But `null` and `undefined` are special-cased out of numeric coercion, so they slip through and get accepted, which is the opposite of what a required-field validator wants.

Decide what "empty" actually means, then test it explicitly:

```js
function reject(userInput) {
  // reject only null, undefined, or an empty/whitespace string
  if (userInput == null) return "rejected";
  if (typeof userInput === "string" && userInput.trim() === "") return "rejected";
  return "accepted";
}
```

Here `userInput == null` is the one sanctioned loose comparison: it catches exactly `null` and `undefined`. The string check uses `===` against a trimmed `""` so no coercion sneaks in, and the numeric `0` or the string `"0"` now correctly pass.

**How to spot it in review:** flag any `==`/`!=` that is not the `== null` idiom, especially comparisons against `false`, `0`, or `""` inside auth or validation code. `== true`/`== false` is almost always a bug hiding a truthiness intent.

**Production symptom:** validation and auth guards accept or reject the wrong inputs. A "quantity of 0" order gets rejected as blank, or a `null` session token sails past a check that only rejected the string `"false"`.

**Common misconception:** that because `null == undefined` is `true`, `null` is also loosely equal to other falsy values like `0`, `""`, or `false`. It is not: `null == 0`, `null == ""`, and `null == false` are all `false`. `null` and `undefined` are loosely equal only to each other.

**Self-check rubric:**
- [ ] I predicted all six `== false` results correctly.
- [ ] My fix uses `== null` (or `=== null || === undefined`) for the nullish case.
- [ ] My fix does not reject the legitimate values `0` or `"0"`.
- [ ] I can state that `==` coerces via `ToNumber`/`ToPrimitive` and `===` does not.
- [ ] I named the production symptom (guards accepting/rejecting the wrong inputs).

#### Practice: real-world variant (save, then reveal)

**Prompt:** Payments feature-flag bug. A pricing service reads `if (config.discount == false) applyFullPrice()`, where `config.discount` comes from a JSON API and can be `0`, `"0"`, `null`, `false`, or a number like `10`. Predict which of those values trigger `applyFullPrice()`, explain why a `0` percent discount is treated the same as a disabled flag, and rewrite the check so only an explicitly disabled flag (literal `false` or missing) applies full price.

**Model answer (revealed on demand):**

`applyFullPrice()` fires for `config.discount` equal to `false`, `0`, `"0"`, and `""` (all `== false`), and does not fire for `null`/`undefined`, `10`, or `"10"`. So a legitimate `0` percent discount and an empty string both accidentally trigger full price, and a `null` (which probably *should* mean "no discount configured, charge full") slips through and does not.

The design flaw is overloading `== false` to mean three different things: the boolean `false`, a zero-valued discount, and "unset". Separate them:

```js
function priceFor(config) {
  const d = config.discount;
  // treat missing or explicitly disabled as full price
  if (d == null || d === false) return "full";
  const pct = Number(d);
  if (!Number.isFinite(pct) || pct <= 0) return "full"; // 0% or garbage -> full price
  return `discounted:${pct}`;
}
```

Now `null`/`undefined`/`false` map to full price by intent, a numeric `0` is handled explicitly (not by accident of coercion), and a real `10` applies the discount. The `== null` idiom carries the nullish case, and `=== false` carries the boolean flag, so the two meanings never blur.

**How to spot it in review:** any `== false`/`== true` against a value that arrives from JSON, where the field can legitimately be `0` or an empty string. **Production symptom:** revenue impact, either charging full price on a valid 0 percent promo or misreading a `null` config as "discount enabled". **Misconception:** that `Number(d)` alone is enough; without the `d === false` and `d == null` branches, `Number(false)` is `0` and `Number(null)` is `0`, silently collapsing distinct states again.

### ajr-l1-nan-object-is: NaN, Object.is, -0 and equality regimes

- **id:** `ajr-l1-nan-object-is`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** js-runnable  ·  **skills:** equality, NaN, Object.is

#### Learn

JavaScript has three equality regimes, and they disagree on exactly two values: `NaN` and `-0`. Knowing which regime a given API uses is the difference between a cache that works and one that silently leaks.

`===` is **Strict Equality**. It has two famous quirks: `NaN === NaN` is `false` (`NaN` is the only value not equal to itself, by IEEE-754 design, because `NaN` represents "not a specific number", so two of them are not the same number), and `-0 === +0` is `true` (the two signed zeros are merged).

`Object.is` is **SameValue**. It flips both quirks: `Object.is(NaN, NaN)` is `true` and `Object.is(-0, 0)` is `false`. It is the most literal "are these the exact same value" test.

`Array.prototype.includes`, `Map` keys, and `Set` members use **SameValueZero**, which is `SameValue` except it treats `-0` and `+0` as equal. So `[NaN].includes(NaN)` is `true` (unlike `indexOf`, which uses `===` and returns `-1`), and a `Set` will not store `NaN` twice.

Now the bug. You maintain a cache and look keys up with strict equality:

```js
const cache = [{ key: 0.1 + 0.2 }, { key: NaN }];
const findIndex = (key) => cache.findIndex((x) => x.key === key);
findIndex(NaN); // -> -1, always. The NaN entry can never be found.
```

Because `NaN === NaN` is `false`, the `NaN` key is unreachable. Every lookup misses, so you keep re-inserting it, the cache grows, and dedup logic that relies on `indexOf(NaN) === -1` never dedupes. One bad `parseInt`/`Number("abc")` producing a `NaN` and flowing into a keyed structure is enough to poison it.

Detection has its own trap. The global `isNaN(x)` coerces its argument first, so `isNaN("abc")` is `true` and `isNaN(undefined)` is `true`, which is usually not what you mean. `Number.isNaN(x)` does no coercion and is `true` only for an actual `NaN`. Always prefer `Number.isNaN`.

**Interview nuance:** React's `useMemo`/`useEffect` dependency comparison and `useState` bail-out use `Object.is`. That means a dep that becomes `NaN` compares equal to a previous `NaN` (so an effect will *not* re-run just because `NaN` stayed `NaN`), and a state update from `-0` to `+0` is treated as a change (`Object.is(-0, 0)` is `false`), while `NaN` to `NaN` is treated as no change and bails out.

Recap: `===` says `NaN != NaN` and `-0 === +0`; `Object.is` (SameValue) says `NaN == NaN` and `-0 != +0`; `includes`/`Map`/`Set` (SameValueZero) say `NaN == NaN` and `-0 == +0`. Use `Number.isNaN` for detection and `includes`/`Object.is` for membership, never `===`, when `NaN` is possible.

#### See it live

**Demo (js-runnable):** prints a table of the pairs `(NaN, NaN)`, `(-0, 0)`, `(0, -0)`, and `(NaN, 5)` evaluated under `===`, `Object.is`, and `[a].includes(b)`, so the three regimes line up column by column.

```js
// Three equality regimes side by side:
// A) === (Strict Equality)
// B) Object.is (SameValue)
// C) [a].includes(b) (SameValueZero)
const pairs = [
  ["NaN", NaN, NaN],
  ["-0 vs 0", -0, 0],
  ["0 vs -0", 0, -0],
  ["NaN vs 5", NaN, 5],
];

console.log("pair        | ===   | Object.is | includes");
for (const [name, a, b] of pairs) {
  const strict = a === b;
  const same = Object.is(a, b);
  const incl = [a].includes(b);
  console.log(
    `${name.padEnd(11)} | ${String(strict).padEnd(5)} | ${String(same).padEnd(9)} | ${incl}`
  );
}

console.log("\n--- the cache bug ---");
const cache = [{ key: NaN }];
console.log("findIndex via === :", cache.findIndex((x) => x.key === NaN)); // -1 (broken)
console.log("findIndex via includes-style:",
  cache.findIndex((x) => Object.is(x.key, NaN))); // 0 (found)

console.log("\n--- detection ---");
console.log("isNaN('abc')        :", isNaN("abc"));        // true (coerced, misleading)
console.log("Number.isNaN('abc') :", Number.isNaN("abc")); // false (no coercion)
console.log("Number.isNaN(NaN)   :", Number.isNaN(NaN));   // true
```

**Watch:** the table shows the three columns disagreeing on exactly the rows that matter. The `NaN` row is `false` under `===` but `true` under both `Object.is` and `includes`. The `-0 vs 0` row is `true` under `===` and `includes` but `false` under `Object.is`, which is the only column that splits the signed zeros. The cache block proves `findIndex` with `===` returns `-1` (the `NaN` key is invisible) while the `Object.is` version returns `0`. The detection block shows `isNaN("abc")` lying with `true` while `Number.isNaN("abc")` correctly returns `false`.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Fix `cache.findIndex(x => x === key)` so it can find a `NaN` key, and separately explain why `Object.is(-0, 0)` is `false` while `-0 === 0` is `true`. Give the corrected lookup and state which equality regime you switched to.

**Think about:**
- Why is `NaN` the only value not equal to itself?
- Which detection uses no coercion: `isNaN` or `Number.isNaN`?
- What equality does React use for deps and bail-out?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The lookup fails because `===` is Strict Equality and `NaN === NaN` is `false`, so a `NaN` key can never match itself. Switch to a regime that treats `NaN` as equal to `NaN`. For membership, `SameValueZero` (via `includes`) or `SameValue` (via `Object.is`) both work:

```js
// Option 1: Object.is handles NaN (and distinguishes -0 from +0)
const index = cache.findIndex((x) => Object.is(x, key));

// Option 2: for a flat array of values, includes uses SameValueZero
const found = cache.includes(key); // true even when key is NaN

// Option 3: guard the NaN case explicitly, still using === for the rest
const idx = cache.findIndex((x) =>
  Number.isNaN(key) ? Number.isNaN(x) : x === key
);
```

Prefer `Object.is` when you might also care about `-0` vs `+0`; prefer `includes`/`SameValueZero` when signed zero should be ignored (the usual case for numeric keys).

Why `Object.is(-0, 0)` is `false` but `-0 === 0` is `true`: `===` deliberately merges the two signed zeros so ordinary arithmetic stays intuitive (`-0` and `+0` behave identically in almost every math operation). `Object.is` implements SameValue, which is bit-for-bit exact and preserves the sign, so it reports the two distinct zero representations as different. `1/-0` is `-Infinity` while `1/+0` is `+Infinity`, which is the one place the distinction leaks into behavior.

**How to spot it in review:** any `=== NaN` (which is unconditionally `false`, a dead branch) or `indexOf(...)`/`=== key` used for membership where the key could be `NaN` from a failed parse. Also flag bare `isNaN(` and suggest `Number.isNaN`.

**Production symptom:** dedup logic and caches silently miss `NaN` keys, so they grow without bound or re-do work, and a single bad parse that produces `NaN` poisons an aggregate (for example a running total that becomes `NaN` and stays `NaN` forever).

**Common misconception:** that `===` handles `NaN` and `-0` "sanely". It does neither: it calls `NaN` unequal to itself and calls `-0` equal to `+0`. If either value is in play, reach for `Number.isNaN`, `Object.is`, or `includes` instead.

**Self-check rubric:**
- [ ] My fix finds a `NaN` key (uses `Object.is`, `includes`, or a `Number.isNaN` guard, not bare `===`).
- [ ] I explained `NaN === NaN` is `false` by IEEE-754 design.
- [ ] I explained `===` merges `-0`/`+0` while `Object.is` (SameValue) keeps them distinct.
- [ ] I chose `Number.isNaN` over `isNaN` and said why (no coercion).
- [ ] I named the production symptom (missed dedup / poisoned aggregate).
- [ ] I can state which regime `includes`/`Map`/`Set` use (SameValueZero).

#### Practice: real-world variant (save, then reveal)

**Prompt:** Analytics dedup at scale. A pipeline dedupes event IDs with `const seen = []; if (!seen.includes(id)) seen.push(id);`, and separately keeps a running average `avg = (avg * n + value) / (n + 1)`. Occasionally an upstream field arrives as `NaN` (a failed `Number(...)`). Explain what happens to both the dedup `Set`/array and the running average when `NaN` enters, rewrite the dedup to use a `Set`, and make the average `NaN`-proof.

**Model answer (revealed on demand):**

Dedup with `includes` (SameValueZero) actually *does* dedupe `NaN` correctly: `[NaN].includes(NaN)` is `true`, so a second `NaN` id is recognized and not pushed. The trap is if someone "optimizes" this to `indexOf(id) !== -1`, which uses `===`, so every `NaN` id looks new and the array grows unbounded. A `Set` is the right structure and keeps the correct SameValueZero semantics while giving O(1) lookups:

```js
const seen = new Set();
function dedupe(id) {
  if (seen.has(id)) return false; // Set uses SameValueZero: NaN matches NaN
  seen.add(id);
  return true;
}
```

The running average is the real casualty. Once a single `value` is `NaN`, `avg` becomes `NaN` and every later term is `NaN * n + NaN`, so the average is permanently poisoned. `===` cannot even detect it downstream. Guard at the boundary with `Number.isFinite` (which rejects `NaN`, `Infinity`, and non-numbers in one check):

```js
function addValue(avg, n, value) {
  if (!Number.isFinite(value)) return { avg, n }; // skip garbage, keep the total clean
  return { avg: (avg * n + value) / (n + 1), n: n + 1 };
}
```

**How to spot it in review:** `indexOf`/`=== ` used for membership on data that can contain `NaN`, and any accumulator that never validates its inputs with `Number.isFinite`/`Number.isNaN`. **Production symptom:** a dashboard metric that shows `NaN` after one bad record, or a dedup set that leaks memory because `NaN` keys keep re-inserting. **Misconception:** that `includes` and `indexOf` are interchangeable; they use different regimes (`SameValueZero` vs `===`), and only `includes`/`Set`/`Map` handle `NaN`.

> Module **1.5** (Hoisting & the TDZ) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [1.4](./l1-equality-coercion.md) · Next: [2.1](./l2-waterfalls-parallelism.md)

# L1 · Hoisting & the TDZ

After this module you will catch the two init-order bugs that survive review because the code reads top to bottom and looks fine: a `var` that silently returns `undefined` because it was read before its assignment ran, and a `let`/`const` (or a hook value) touched above its declaration line that throws a `ReferenceError` only on certain code paths. You will be able to explain why `var` fails quietly while `let`/`const` fail loudly (the Temporal Dead Zone), and why a `var` declared inside an `if` block is still readable, as `undefined`, outside it.

### ajr-l1-hoisting-tdz: Hoisting and the Temporal Dead Zone

- **id:** `ajr-l1-hoisting-tdz`  ·  **difficulty:** easy  ·  **est:** 12 min  ·  **demo:** js-runnable  ·  **skills:** hoisting, tdz, var-let

#### Learn

Every declaration in a scope is registered (hoisted) when the engine enters that scope, before any line runs. That much is true for `var`, `let`, `const`, `function`, and `class`. The difference that bites people is what value the binding holds during the window between scope entry and the line where the declaration actually appears.

A `var` is registered *and initialized to `undefined`* at scope entry. So reading it before its assignment line is legal and gives you `undefined`, silently. A `let` or `const` is registered but left *uninitialized*: touching it before its declaration line throws `ReferenceError: Cannot access 'x' before initialization`. That uninitialized window is the Temporal Dead Zone (TDZ). It starts at scope entry and ends the moment control reaches the declaration.

```js
function demo() {
  console.log(a); // undefined  (var: hoisted AND initialized to undefined)
  // console.log(b); // would throw: ReferenceError, b is in its TDZ here
  greet();         // "hi"       (function declaration: fully hoisted, callable)
  var a = 1;
  let b = 2;
  function greet() { return "hi"; }
}
```

Function *declarations* are hoisted whole (name and body), so you can call them above their definition. A `const` (or `let`) holding an arrow function is not: only the binding is hoisted, and it is in the TDZ until its line, so calling it early throws. That is the practical reason `function foo(){}` and `const foo = () => {}` behave differently at the top of a file even though both "define a function".

**Interview nuance:** `typeof` is not a safe probe for a TDZ variable. People remember that `typeof neverDeclared` returns `"undefined"` for a name that was never declared anywhere. But `typeof x` where `x` is a `let`/`const` in its TDZ throws the same `ReferenceError`, because the name *is* declared in this scope, just not yet initialized. The engine resolves the binding, sees it is uninitialized, and throws before `typeof` ever runs. So the old "guard with `typeof`" trick works only for truly undeclared globals, not for a block-scoped variable you referenced too early.

The mental model to drop is "hoisting physically moves code to the top". Nothing moves. The engine does a declaration pass that reserves the names, then runs the code in place. `var` names are reserved *with* an `undefined` value; `let`/`const` names are reserved *without* a value and stay poisoned until their line executes.

Recap: all declarations are hoisted, but only `var` is pre-initialized to `undefined`. `let`/`const` sit in the TDZ (declared but uninitialized) and throw if touched early. Function declarations are callable before their line; `const` arrow expressions are not. `typeof` does not rescue you from a TDZ reference.

#### See it live

**Demo (js-runnable):** reads a `var` above its assignment (logs `undefined`), calls a function declaration before its definition (works), then tries to read a `let` above its declaration inside a `try/catch` and prints the caught `ReferenceError` as a card, then contrasts with `typeof` on a truly undeclared name.

```js
// A) var: hoisted and pre-initialized to undefined (silent)
function readVarEarly() {
  const before = value;   // no throw: var is already undefined here
  var value = 42;
  return { before, after: value };
}
console.log("A) var read before assignment:", readVarEarly());
// -> { before: undefined, after: 42 }

// B) function declaration: fully hoisted, callable above its definition
function callFnEarly() {
  const result = compute(); // works, body is hoisted
  function compute() { return "ran"; }
  return result;
}
console.log("B) function declaration called early:", callFnEarly());
// -> "ran"

// C) let/const: in the TDZ until its line, throws if touched early
function readLetEarly() {
  try {
    // touching `total` here is inside its TDZ
    return total + 1;
    let total = 10; // declaration that ends the TDZ (never reached)
  } catch (err) {
    return `CAUGHT: ${err.name}: ${err.message}`;
  }
}
console.log("C) let read before declaration:", readLetEarly());
// -> "CAUGHT: ReferenceError: Cannot access 'total' before initialization"

// D) typeof: safe for a truly-undeclared name, NOT for a TDZ name
console.log("D1) typeof neverDeclared:", typeof neverDeclared); // "undefined" (safe)
function typeofInTdz() {
  try {
    return typeof scoped;   // throws: scoped is declared below, in TDZ
    let scoped = 1;
  } catch (err) {
    return `CAUGHT: ${err.name}`;
  }
}
console.log("D2) typeof on a TDZ let:", typeofInTdz()); // "CAUGHT: ReferenceError"
```

**Watch:** block A logs `{ before: undefined, after: 42 }`, proving the `var` binding already exists and holds `undefined` before its assignment line runs. Block B returns `"ran"`, proving a function declaration is callable above its definition. Block C catches and prints `ReferenceError: Cannot access 'total' before initialization`, the visible face of the TDZ. Block D is the key contrast: `typeof neverDeclared` safely returns the string `"undefined"`, but `typeof scoped` on a variable declared later in the same scope throws, because the name is declared (so it resolves) but uninitialized (so it is poisoned). This mirrors a scope timeline where the binding exists from scope entry but the TDZ shading only clears at the declaration line.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Predict the output of reading a `var` before its assignment versus reading a `let` before its declaration in the snippet below, then explain why `typeof` throws for a TDZ `let` but is safe for a name that was never declared at all. Give the corrected ordering.

```js
function f() {
  console.log(x); // ?
  console.log(typeof y); // ?
  var x = 1;
  let y = 2;
}
```

**Think about:**
- What value does a `var` have before its assignment line?
- What does the TDZ convert a silent bug into?
- Are function declarations and `const` arrow expressions hoisted the same?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

Prediction: `console.log(x)` logs `undefined`. `console.log(typeof y)` does not log anything, it throws `ReferenceError: Cannot access 'y' before initialization`, because `y` is a `let` sitting in its TDZ.

Mechanism: on entering `f`, the engine registers all three-ish bindings. `x` (a `var`) is registered *and* initialized to `undefined`, so reading it early is legal and returns `undefined`. `y` (a `let`) is registered but left uninitialized, so any read, including one wrapped in `typeof`, resolves the binding, finds it poisoned, and throws. `typeof` is safe only for a name the engine cannot resolve at all (a never-declared global), where it short-circuits to `"undefined"` without evaluating a binding. Here `y` *is* declared in this scope, so there is a binding to resolve, and resolving it throws.

Corrected code: declare before use, and prefer `const`/`let` so ordering mistakes surface loudly instead of returning a stealth `undefined`.

```js
function f() {
  const x = 1;
  const y = 2;
  console.log(x);         // 1
  console.log(typeof y);  // "number"
}
```

**How to spot it in review:** any read of a `const`/`let` (or a value derived from a React hook) that appears textually above its declaration, and any code that leans on `var` hoisting to "use before declare". A `typeof someLocal` guard is a smell if `someLocal` is a block-scoped variable declared later.

**Production symptom:** two shapes. With `var`, an `undefined`-where-a-value-was-expected bug: a computed config reads as `undefined` and a downstream default silently kicks in, so the feature quietly runs with wrong values and no error. With `let`/`const`, a `ReferenceError` that appears after a refactor, often only on one branch, when someone moves a declaration below a use or reorders imports.

**Common misconception:** that hoisting physically relocates declarations to the top of the scope. It does not move any code. The engine reserves the names in a declaration pass, giving `var` an `undefined` value and giving `let`/`const` no value (the TDZ), then executes the body in its written order.

**Self-check rubric:**
- [ ] I predicted `x` logs `undefined` and the `typeof y` line throws `ReferenceError`.
- [ ] I explained the TDZ as "declared but uninitialized until the declaration line".
- [ ] I stated why `typeof` is safe for an undeclared name but not a TDZ name.
- [ ] My fix declares before use and prefers `const`/`let`.
- [ ] I named both production symptoms (silent `undefined` for `var`, loud `ReferenceError` for `let`/`const`).

#### Practice: real-world variant (save, then reveal)

**Prompt:** Config-module load-order regression. A settings module exported `export const API_BASE = ...` at the bottom, and a helper defined above it read `API_BASE` at module-evaluation time (not inside a function). It worked when the helper was a hoisted `function` that was only *called* later, but a teammate rewrote the helper to compute a value at module top level. Now the app throws `ReferenceError: Cannot access 'API_BASE' before initialization` on startup. Explain what the TDZ has to do with module top-level code, and rewrite so evaluation order is safe.

**Model answer (revealed on demand):**

Module top-level code runs top to bottom exactly once at import time, and `const`/`let` at module scope have a TDZ just like inside a function. The name `API_BASE` is registered when the module starts evaluating, but it stays in its TDZ until its own `export const API_BASE = ...` line runs. The old hoisted `function` helper was fine because a function *body* only executes when called, and it was called after the whole module finished evaluating, so `API_BASE` was already initialized by then. The rewrite moved the read to top level, above the declaration line, so it now touches `API_BASE` while it is still poisoned and throws.

```js
// BROKEN: top-level read above the const declaration
const DEFAULT_TIMEOUT = deriveTimeout(API_BASE); // TDZ read -> ReferenceError
export const API_BASE = process.env.API_BASE ?? "https://api.example.com";

// FIXED: declare dependencies before the code that reads them
export const API_BASE = process.env.API_BASE ?? "https://api.example.com";
const DEFAULT_TIMEOUT = deriveTimeout(API_BASE); // API_BASE is initialized now
```

If reordering is awkward (circular imports, for instance), defer the read into a function so it runs after evaluation, which is the pattern the original hoisted helper accidentally relied on:

```js
export const getTimeout = () => deriveTimeout(API_BASE); // read at call time, not load time
```

**How to spot it in review:** any top-level (module or class-field) expression that reads a `const`/`let` declared later in the same file, and refactors that turn a called-later `function` into eagerly-evaluated top-level code. **Production symptom:** the whole module (and anything importing it) fails to load with a startup `ReferenceError`, often surfacing as a blank page or a crash on the very first import, not a runtime error deep in a flow. **Misconception:** that top-level `const` is "available everywhere in the file" like a hoisted `var` would be. Only its *name* is hoisted; its *value* exists only from its declaration line onward, and reading it earlier throws.

### ajr-l1-block-vs-function-scope: Block scope vs function scope (var leaking out of blocks)

- **id:** `ajr-l1-block-vs-function-scope`  ·  **difficulty:** easy  ·  **est:** 10 min  ·  **demo:** js-runnable  ·  **skills:** scope, var-let, blocks

#### Learn

`var` does not care about block braces. Its scope is the nearest enclosing *function* (or the module/global scope), not the nearest `{ }`. So a `var` declared inside an `if`, `for`, `while`, or bare block is visible for the entire function, before and after that block. `let` and `const` are scoped to the nearest block, exactly the braces you wrote, which is what almost everyone expects.

The classic symptom is a value that leaks out of a conditional as `undefined`:

```js
function getResult(cond) {
  if (cond) {
    var result = compute(); // var: function-scoped, not if-scoped
  }
  return result; // when cond is false, result is undefined (not a ReferenceError)
}
```

When `cond` is false, the `if` body never runs, so `result` is never assigned. But the `var result` binding was still hoisted to the top of `getResult` and initialized to `undefined`, so `return result` hands back `undefined` instead of failing loudly. The bug rides downstream as a stealth `undefined`. Swap to `let`/`const` and `result` no longer exists outside the block, so `return result` throws `ReferenceError` at exactly the line that is wrong, turning a silent data bug into an immediate, obvious one.

This is the same mechanism behind the for-loop closure bug. `for (var i = 0; ...)` creates **one** function-scoped `i` that every closure in the loop shares, so callbacks all see the final value. `for (let i = 0; ...)` creates a **fresh block-scoped binding per iteration**, so each closure captures its own `i`. The loop-capture surprise and the "var leaks out of the `if`" surprise are two faces of the same fact: `var` is function-scoped, `let`/`const` are block-scoped.

**Interview nuance:** `let`/`const` per-iteration bindings are specifically a `for` loop feature, and the spec copies the binding forward each iteration. That is why `let` fixes the closure bug without any IIFE. Before `let` existed, the fix was to wrap the body in an IIFE `(function(j){ ... })(i)` to create a new function scope per iteration. `let` gives you that new scope per iteration for free. Note the per-iteration binding applies to the loop `let`, not to a `let` you declare *inside* the body, which is already block-scoped anyway.

Recap: `var` is scoped to the nearest function and leaks out of blocks (reading as `undefined` when the block did not run); `let`/`const` are scoped to the nearest block. Default to `const`, use `let` only when you reassign, and avoid `var`. The for-loop capture bug is the same function-vs-block-scope issue in disguise, and `let` fixes it via per-iteration bindings.

#### See it live

**Demo (js-runnable):** declares a `var` inside an `if` that does not run and reads it afterward (logs `undefined`), does the same with `let` inside a `try/catch` and prints the caught `ReferenceError`, then runs the for-loop capture contrast with `var` versus `let` and logs both callback outputs.

```js
// A) var declared in a block that did NOT run: leaks out as undefined
function withVar(cond) {
  if (cond) {
    var result = "computed";
  }
  return result; // var is function-scoped, so this is legal
}
console.log("A) var, cond=false:", withVar(false)); // undefined (silent)
console.log("A) var, cond=true :", withVar(true));  // "computed"

// B) let stays inside the block: reading it after throws
function withLet(cond) {
  if (cond) {
    let result = "computed";
  }
  try {
    return result; // ReferenceError: result is block-scoped, not defined here
  } catch (err) {
    return `CAUGHT: ${err.name}`;
  }
}
console.log("B) let, cond=false:", withLet(false)); // "CAUGHT: ReferenceError"

// C) for-loop capture: one shared var vs a fresh let per iteration
function captureWithVar() {
  const fns = [];
  for (var i = 0; i < 3; i++) fns.push(() => i);
  return fns.map((fn) => fn()); // all see the final i
}
function captureWithLet() {
  const fns = [];
  for (let i = 0; i < 3; i++) fns.push(() => i);
  return fns.map((fn) => fn()); // each captured its own i
}
console.log("C) var capture:", captureWithVar()); // [3, 3, 3]
console.log("C) let capture:", captureWithLet()); // [0, 1, 2]
```

**Watch:** block A returns `undefined` when `cond` is false and `"computed"` when true, proving the `var` binding exists across the whole function and simply stays `undefined` when the `if` body is skipped, no error. Block B catches a `ReferenceError`, proving the `let` version does not leak: `result` does not exist outside its block, so the bug fails at the right line instead of returning stealth `undefined`. Block C is the same mechanism at loop scale: `var` prints `[3, 3, 3]` because all three closures share one function-scoped `i` that ended at `3`, while `let` prints `[0, 1, 2]` because each iteration got its own block-scoped `i`.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Switch to `let`/`const` a function that reads a `var` declared inside an `if` block and gets `undefined` when the condition was false, and explain what leaked. Use the snippet below, give the corrected version, and say what changes about the failure mode.

```js
function labelFor(user) {
  if (user.isAdmin) {
    var label = "admin";
  }
  return label.toUpperCase(); // crashes for non-admins
}
```

**Think about:**
- What is the scope of a `var` declared in a block?
- How does this connect to the for-loop capture bug?
- What should you default to?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

What leaked: the `var label` binding. `var` is function-scoped, so it is hoisted to the top of `labelFor` and initialized to `undefined`, regardless of the `if`. For a non-admin, `user.isAdmin` is false, the assignment never runs, and `label` stays `undefined`. `return label.toUpperCase()` then throws `TypeError: Cannot read properties of undefined (reading 'toUpperCase')`. The `var` did not scope `label` to the `if`; it made `label` exist (as `undefined`) for the whole function.

The fix is block scoping. Declare the variable in the function's scope with an explicit default, or compute it as a `const`, so every path assigns a real value:

```js
function labelFor(user) {
  const label = user.isAdmin ? "admin" : "member";
  return label.toUpperCase();
}
```

If you truly want "nothing for non-admins", make that explicit rather than leaning on an accidental `undefined`:

```js
function labelFor(user) {
  if (!user.isAdmin) return null;
  const label = "admin";
  return label.toUpperCase();
}
```

Why this connects to the loop bug: both come from `var` being function-scoped. In a loop, one shared `var i` leaks across all iterations so every closure sees the final value (`[3, 3, 3]`); here one function-scoped `var label` leaks across both branches so the false branch reads `undefined`. `let`/`const`'s per-block (and per-iteration) scoping fixes both.

**How to spot it in review:** any `var`, and specifically a `var` assigned only inside a conditional or loop body but read outside it. Loop counters and per-iteration temporaries declared with `var` are the highest-signal cases. Reach for `const` by default, `let` when you reassign.

**Production symptom:** a value reads as `undefined` (or the code crashes with a `TypeError` when something calls a method on it) on exactly the code path where the block did not run. It often ships because tests only cover the `true` branch, and the `false` branch quietly returns or crashes in production.

**Common misconception:** that `var` and `let` are interchangeable and the choice is stylistic. They have different scoping rules: `var` is function-scoped and leaks out of blocks with an `undefined` default; `let`/`const` are block-scoped and confine the binding to the braces you wrote. Defaulting to `var` reintroduces both the leak bug and the loop-capture bug.

**Self-check rubric:**
- [ ] I stated that `var` is function-scoped, so `label` exists (as `undefined`) outside the `if`.
- [ ] My fix uses `const`/`let` (or an explicit default) so every path assigns a value.
- [ ] I connected this to the for-loop capture bug as the same function-vs-block scope issue.
- [ ] I said "default to `const`, `let` when reassigning, never `var`".
- [ ] I named the production symptom (silent `undefined` / `TypeError` on the skipped branch).

#### Practice: real-world variant (save, then reveal)

**Prompt:** Analytics batch loop, at scale. A worker builds per-item retry handlers in a loop and registers them: `for (var i = 0; i < items.length; i++) { queue.on(items[i].id, () => retry(items[i])) }`. In production every handler retries the *last* item, and a separate `var status` declared inside a `try` block reads as `undefined` in the `catch`. Explain both failures, then rewrite so each handler captures its own item and `status` is scoped correctly.

**Model answer (revealed on demand):**

Both are function-scope leaks. In the loop, `var i` is a single binding shared by all iterations, and every arrow closure captures that same `i` by reference, not its value at registration time. By the time any handler fires, the loop has finished and `i` equals `items.length`, so `items[i]` is `undefined` and each handler operates on the final item (or crashes). Switching the loop counter to `let` gives each iteration a fresh `i`, so each closure captures its own index:

```js
for (let i = 0; i < items.length; i++) {
  const item = items[i]; // block-scoped snapshot, extra safety
  queue.on(item.id, () => retry(item));
}
```

Capturing a `const item` inside the block is the clearest fix: even readers who do not trust their `let` intuition can see each handler closes over its own `item`. For a `forEach`/`map` you get a fresh parameter per call for free, which is why `items.forEach(item => queue.on(item.id, () => retry(item)))` never had this bug.

The `status` case is the block-leak variant: `var status` inside `try` is function-scoped, so it exists in the `catch`, but if the throw happened *before* the assignment line, `status` is still `undefined`. Declare it with `let` in the right scope, or default it:

```js
let status = "pending"; // scoped to the function, explicit default
try {
  status = await process();
} catch (err) {
  report(status, err); // "pending" if it threw before assignment, never a stealth undefined
}
```

**How to spot it in review:** `for (var i ...)` with a closure created in the body, and any `var` assigned inside `try`/`if` but read in `catch`/`else`. **Production symptom:** every callback acts on the last loop item (duplicate work, wrong record retried, or `undefined` index crashes), and error handlers log `undefined` state, masking what actually failed. **Misconception:** that `let` "makes closures work" by magic; it fixes the loop specifically because the spec creates a fresh per-iteration binding and copies the counter forward, which is the modern replacement for the old per-iteration IIFE.

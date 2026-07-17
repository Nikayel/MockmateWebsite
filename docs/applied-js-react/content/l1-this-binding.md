> Module **1.3** (this Binding) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [1.2](./l1-references-identity.md) · Next: [1.4](./l1-equality-coercion.md)

# L1 · this Binding

After this module you will be able to look at any function reference and predict what `this` resolves to before you run it, so you can catch the single most common class of "cannot read property of undefined" handler bugs during code review instead of in production.

### ajr-l1-this-lost-receiver: Losing this: the detached method

- **id:** `ajr-l1-this-lost-receiver`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** js-runnable  ·  **skills:** this, binding, methods

#### Learn

The single fact that unlocks `this` for regular functions: `this` is not decided when you write the function, it is decided at the call site, every time you call it. The syntax at the moment of invocation is what matters, not where the function was defined.

Look at a plain object with a method:

```js
const user = {
  name: "Ada",
  greet() {
    return `Hi, ${this.name}`;
  },
};

user.greet();        // "Hi, Ada"      -> called as user.greet(), this = user
const g = user.greet;
g();                 // throws in strict mode
```

Both calls invoke the exact same function object. The difference is entirely in the call expression. When you write `user.greet()`, the interpreter evaluates the member expression `user.greet` and remembers the "base" (`user`) as the receiver, so inside the body `this === user`. When you write `g()`, there is no base. It is a bare call, so there is no receiver to hand in.

What `this` becomes at a bare call depends on the mode. In sloppy (non-strict) mode `this` falls back to the global object (`window` / `globalThis`), so `this.name` reads `undefined` and you get the silent-wrong-answer version: `"Hi, undefined"`. In strict mode, and inside ES modules and class bodies which are always strict, `this` is `undefined`, so `this.name` throws `TypeError: Cannot read properties of undefined (reading 'name')`. Modern React and bundled code is effectively always strict, so you hit the throw, not the silent version.

This is why you rarely see the bug on the object itself and almost always see it when the method gets detached from its receiver: `promise.then(user.greet)`, `arr.map(obj.format)`, `<button onClick={this.handleClick}>`, `setTimeout(this.tick, 1000)`. Each of those passes the function value alone. The receiver is stripped the moment you write `.method` without immediately calling it.

Three robust fixes, each with a different mechanism:

```js
class User {
  name = "Ada";
  // 1) Arrow class field: this is captured lexically at construction, per instance.
  greetArrow = () => `Hi, ${this.name}`;
  // 2) Regular method + bind in the constructor: returns a NEW function permanently bound.
  greet() { return `Hi, ${this.name}`; }
  constructor() { this.greet = this.greet.bind(this); }
}
// 3) Wrapper arrow at the call site: keep the method, call it through an arrow.
promise.then(() => user.greet());
```

**Interview nuance:** an arrow class field is not free. It lives on each instance, not the prototype, so a component with a thousand rows creates a thousand copies, and you cannot call it through the prototype or override it cleanly in a subclass. `bind` also allocates a new function (new identity), which matters for `React.memo` and dependency arrays.

**Interview nuance:** you cannot always reach for an arrow. If the API deliberately calls your function with a dynamic `this` (a prototype method, a jQuery-style `.each` callback, a mocha `it()` using `this.timeout`), an arrow permanently ignores that receiver and breaks the contract.

Recap: `this` for a regular function is set by the call site, a bare call in strict mode gives `this = undefined`, and detaching a method (`const g = obj.m`) strips the receiver, so re-attach it with an arrow field, `bind`, or a wrapper arrow.

#### See it live

**Demo (js-runnable):** runs an object with `greet(){ return this.name }`, called as `obj.greet()` versus `const g = obj.greet; g()`, and prints the resolved receiver for each call form.

```js
"use strict";

const user = {
  name: "Ada",
  greet() {
    return this === undefined ? "<this is undefined>" : `Hi, ${this.name}`;
  },
};

function run(label, fn) {
  try {
    console.log(label, "->", fn());
  } catch (err) {
    console.log(label, "-> THREW:", err.message);
  }
}

// A) attached call: base of the member expression becomes the receiver
run("A) user.greet()          ", () => user.greet());

// B) detached bare call: no base, strict mode => this is undefined
const g = user.greet;
run("B) const g = user.greet;g", () => g());

// C) re-attached with bind: receiver locked in, survives detachment
const bound = user.greet.bind(user);
run("C) user.greet.bind(user) ", () => bound());

// D) re-attached with a wrapper arrow at the call site
run("D) () => user.greet()     ", () => (() => user.greet())());

// timing note: bind allocates a new function object each call
const t0 = performance.now();
for (let i = 0; i < 100000; i++) user.greet.bind(user);
console.log("100k .bind() allocations took", (performance.now() - t0).toFixed(2), "ms");
```

**Watch:** row A prints `Hi, Ada` because the member base `user` is the receiver, row B throws `Cannot read properties of undefined` because the bare call has no receiver and strict mode makes `this` undefined, and rows C and D both recover `Hi, Ada` by re-attaching the receiver. The timing line makes concrete that `.bind` is not free: it allocates a fresh function object every call, which is why binding-in-render is a real cost.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Explain why `const g = obj.greet; g()` throws, then make it robust three ways (arrow class field, `.bind`, and a wrapper arrow), and say for each fix what it costs.

**Think about:**
- What determines `this` for a regular function?
- What is `this` at a bare call in strict mode?
- When can you NOT use an arrow to fix it?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

`const g = obj.greet` copies the function value out of the object. It does not copy any receiver, because a regular function has no bound receiver until the moment it is called. When you then call `g()`, the call expression has no base, so it is a bare call. In strict mode (which modules and class bodies always are) a bare call sets `this = undefined`, and `this.name` throws `TypeError: Cannot read properties of undefined`.

Three fixes:

```js
// 1) Arrow class field: this captured lexically per instance at construction.
class User {
  name = "Ada";
  greet = () => `Hi, ${this.name}`;
}
// 2) bind: returns a new function permanently pinned to a receiver.
const g2 = user.greet.bind(user);
// 3) Wrapper arrow at the call site: keep the method attached inside the arrow.
promise.then(() => user.greet());
```

Costs. The arrow field lives on every instance instead of the prototype, so it multiplies memory per instance and cannot be overridden through the prototype chain. `bind` allocates a new function with a new identity, so binding in render defeats `React.memo` and changes `useCallback`/`useEffect` dependencies. The wrapper arrow is the cheapest conceptually but adds one closure per call site and can hide which method is really being invoked.

**How to spot it in review:** look for a method referenced without being immediately called: `onClick={this.handleClick}`, `promise.then(obj.method)`, `setTimeout(this.tick, 1000)`, `arr.forEach(svc.process)`. Any `.method` that is passed as a value rather than called is a detached receiver waiting to blow up.

**Production symptom:** "Cannot read properties of undefined" thrown from inside a handler or callback, often intermittently, appearing only when the code path that passes the method as a callback runs (a click, a resolved promise, a timer), never when the method is called directly in a test.

**Common misconception to correct:** "arrows are always safer, so just make everything an arrow." Arrows fix accidental detachment but they permanently ignore the call site, so a method that is supposed to receive a dynamic `this` (a prototype method, a library callback that passes context) will silently read the wrong `this` forever. Match the fix to whether the function needs a fixed identity (`this`) or a dynamic one.

**Self-check rubric:**
- [ ] I said `this` is resolved at the call site, not at definition.
- [ ] I said a bare call in strict mode gives `this = undefined` (and why modules/classes are strict).
- [ ] I gave all three fixes with correct, runnable code.
- [ ] I named a distinct cost for each fix (per-instance memory, new identity, extra closure).
- [ ] I described the review tell (a `.method` passed as a value) and the production symptom.

#### Practice: real-world variant (save, then reveal)

**Prompt:** "The disappearing event bus." A team ships an analytics client `class Analytics { constructor(){ this.queue = [] } track(evt){ this.queue.push(evt) } }`. Feature teams register it as `emitter.on("click", analytics.track)`. It works in unit tests but crashes in production with "Cannot read properties of undefined (reading 'push')". Diagnose it, ship a fix that keeps `analytics.track` usable as a passed callback everywhere, and explain why the unit tests never caught it.

**Model answer (revealed on demand):**

The registration `emitter.on("click", analytics.track)` passes the `track` function value with no receiver. When the emitter later invokes the stored callback, it calls it bare (or with the emitter as `this`, depending on the library), so inside `track`, `this` is not the `Analytics` instance. `this.queue` is `undefined`, and `this.queue.push(evt)` throws.

Fix by pinning the receiver where the instance is created, so every consumer that passes the method still gets the right `this`:

```js
class Analytics {
  constructor() {
    this.queue = [];
    this.track = this.track.bind(this); // one bind, every passed reference is safe
  }
  track(evt) {
    this.queue.push(evt);
  }
}
```

An arrow class field (`track = (evt) => { this.queue.push(evt); }`) works identically here and is the more modern spelling. Prefer `bind` in the constructor only if subclasses need to call `super.track` through the prototype.

Why the tests passed: unit tests almost always call the method attached, `analytics.track({...})`, which supplies the instance as the receiver, so `this` is correct and the bug is invisible. The failure only appears when the method is detached and stored as a callback, which is exactly what the event bus does and what a direct-call test never does. The lesson for the test suite: add a regression test that exercises the real usage, `emitter.on("click", analytics.track); emitter.emit("click", {...}); expect(analytics.queue).toHaveLength(1)`. Test the method the way production passes it, not the way it is most convenient to call.

The deeper point: the receiver bug lives at the boundary between your object and any API that stores your function to call later. Any such handoff (event emitters, `then`, `setTimeout`, React props) strips the receiver, so bind at construction is the one-time cost that makes the instance safe to pass anywhere.

### ajr-l1-arrow-vs-function-this: Arrow vs regular functions for this

- **id:** `ajr-l1-arrow-vs-function-this`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** js-runnable  ·  **skills:** this, arrow-functions

#### Learn

Regular functions and arrow functions resolve `this` by opposite rules, and knowing which is which is the whole game.

A regular function has no `this` of its own until it is called. It gets one, freshly, on every invocation, decided by the call site (the previous lesson). An arrow function has no `this` binding at all, ever. When code inside an arrow reads `this`, the lookup walks up the lexical scope, exactly like reading any other free variable, until it finds a `this` in an enclosing regular function or the module top level. The arrow captures the `this` of wherever it was written, and no call site can change it.

Four call forms make the rule concrete:

```js
const obj = {
  x: 42,
  method() { return this; },          // regular method
  arrow: () => this,                  // arrow field on an object literal
};

obj.method();          // obj          -> call site supplies receiver
const m = obj.method;
m();                   // undefined    -> bare call, strict mode
obj.arrow();           // NOT obj      -> lexical this of the module (undefined in a module)
obj.method.bind(obj)(); // obj         -> bind pins the receiver
```

The trap is the third line. Writing `arrow: () => this` inside an object literal feels like defining a method, but the arrow captures `this` from the scope surrounding the object literal, which is the module (or the enclosing function), not the object. There is no invisible "the object I am attached to" for an arrow. So `obj.arrow()` reads the module's `this` (`undefined` in an ES module), and `this.x` is `undefined` or throws. An arrow is the wrong tool for an object or prototype method that needs the instance.

Where arrows are exactly right is the inverse case: a callback defined inside a method that wants to keep the outer `this`.

```js
class Timer {
  seconds = 0;
  start() {
    setInterval(() => { this.seconds++; }, 1000); // arrow keeps start()'s this = the instance
  }
}
```

Here a regular `function () { this.seconds++; }` would fail, because `setInterval` calls it bare and `this` would be `undefined`. The arrow captures `start`'s `this`, which is the instance, so it just works. This is the pattern the arrow was designed for.

**Interview nuance:** `call`, `apply`, and `bind` cannot change an arrow's `this`. They are accepted syntactically and silently ignored for `this` (arguments still pass through). `arrowFn.call(someObj)` runs `arrowFn` with its original captured `this`, not `someObj`. This surprises people who reach for `.call` to "fix" an arrow.

**Interview nuance:** what `bind` returns is a new, distinct function object. That new identity is why `useCallback` exists: `handler.bind(this)` in a render produces a different function every render, so any child memoized on that prop re-renders and any effect depending on it re-runs.

Recap: arrows capture `this` lexically from where they are defined and ignore the call site (and ignore `call`/`apply`/`bind` for `this`), while regular functions resolve `this` per call from the call site. Use a regular function when the receiver should be dynamic (methods), use an arrow when you want to inherit the enclosing `this` (inner callbacks).

#### See it live

**Demo (js-runnable):** logs `this` for four call forms, the object-method call, an extracted bare call, an arrow method, and a bound function, side by side, so the "this is set by the call site, not the definition" rule becomes a table.

```js
"use strict";

// A tag so we can identify which object (if any) became the receiver.
const obj = {
  tag: "obj",
  method() { return this ? this.tag ?? "<no tag>" : "<undefined>"; },
  arrow: () => (typeof globalThis !== "undefined" && this === globalThis
    ? "<global>"
    : "<lexical: not obj>"),
};

function show(label, fn) {
  try {
    console.log(label, "-> this resolves to:", fn());
  } catch (e) {
    console.log(label, "-> THREW:", e.message);
  }
}

// 1) object-method call: receiver = obj
show("1) obj.method()        ", () => obj.method());

// 2) extracted bare call: receiver = undefined (strict)
const bare = obj.method;
show("2) const f=obj.method;f", () => bare());

// 3) arrow "method": ignores obj, uses lexical this from module scope
show("3) obj.arrow()         ", () => obj.arrow());

// 4) bound function: receiver pinned to obj forever
const bound = obj.method.bind(obj);
show("4) obj.method.bind(obj)", () => bound());

// proof that call/apply/bind cannot rebind an arrow's this:
const stubborn = obj.arrow;
show("5) obj.arrow.call({tag:'X'})", () => stubborn.call({ tag: "X" }));
```

**Watch:** row 1 resolves to `obj` (call site supplies the receiver), row 2 throws or shows `<undefined>` (bare call, strict `this`), row 3 shows `<lexical: not obj>` proving the arrow ignored `obj` and used the scope where it was written, and row 4 shows `obj` because `bind` pinned it. Row 5 also shows `<lexical: not obj>`, not `X`, proving `.call` cannot override an arrow's captured `this`. The table makes the definition-versus-call-site distinction impossible to miss.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Predict `this` for each of the four call forms (`obj.method()`, extracted bare call, `obj.arrow()`, and the bound function), write the resolved value for each, then explain the one case where an arrow method is wrong because the code needs a dynamic `this`.

**Think about:**
- Which forms give the object as `this`?
- Why does an arrow object method that reads `this.x` fail?
- What does `bind` return and how does that affect identity?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The four resolutions:

```
obj.method()           -> this === obj        (call site supplies the receiver)
const m = obj.method; m()  -> this === undefined  (bare call, strict mode)
obj.arrow()            -> this === the lexical enclosing this (module top = undefined), NOT obj
obj.method.bind(obj)() -> this === obj        (bind pins the receiver permanently)
```

The mechanism: a regular function resolves `this` per invocation from the call site, so attaching it (`obj.method()`) hands in `obj`, and detaching it (`m()`) hands in nothing, which strict mode makes `undefined`. An arrow has no own `this`, so `obj.arrow` does not get `obj` as a receiver at all. It captured `this` from the scope where the arrow literal was written, which for an object property is the surrounding module or function, not the object. That is why an arrow object method reading `this.x` fails: `this` is never the object, so `this.x` is `undefined` or throws.

Where an arrow method is wrong: any method that must see the instance (or a caller-supplied receiver) as `this`. A prototype method, a class method that reads instance fields, or a library callback invoked as `cb.call(context)` all depend on a dynamic `this`. An arrow permanently ignores that, so it reads the wrong `this` silently.

```js
// WRONG: arrow object method, this is not the object
const counter = { n: 0, inc: () => { this.n++; } }; // this.n is not counter.n
// RIGHT: regular method, this resolves to the receiver at the call site
const counter2 = { n: 0, inc() { this.n++; } };
```

**How to spot it in review:** an arrow assigned as an object property or on a prototype that reads `this.<field>`. If the function needs the instance and it is an arrow, it is a bug.

**Production symptom:** handlers and methods silently reading `undefined` or global values instead of instance state, so counters never increment, caches never populate, and there is no error, just wrong behavior that unit tests calling the method directly may still miss.

**Common misconception to correct:** "if an arrow's `this` is wrong I can fix it with `.call`, `.apply`, or `.bind`." You cannot. Those methods do not change an arrow's `this`. It stays whatever it captured lexically. Also remember `bind` returns a brand new function object with a new identity, which is why binding in render breaks memoization and dependency arrays.

**Self-check rubric:**
- [ ] I gave the correct `this` for all four forms (obj, undefined, lexical/not-obj, obj).
- [ ] I explained arrows capture `this` lexically and have no own `this`.
- [ ] I said why an arrow object method reading `this.x` fails.
- [ ] I named the case that needs dynamic `this` and showed the regular-method fix.
- [ ] I noted `bind` returns a new function with a new identity (memoization impact).

#### Practice: real-world variant (save, then reveal)

**Prompt:** "The store that never updates." A Redux-style store is written as `const store = { state: { count: 0 }, listeners: [], dispatch: (action) => { this.state.count += action.amount; this.listeners.forEach(l => l()); } }`. Every dispatch throws `Cannot read properties of undefined (reading 'count')`. Diagnose the exact cause, fix it while keeping `dispatch` safe to pass as a callback to `store.subscribe`, and explain why simply changing `dispatch` to a regular function is necessary but not sufficient.

**Model answer (revealed on demand):**

The cause: `dispatch` is an arrow function defined as an object property. Arrows have no own `this`, so inside `dispatch`, `this` is not `store`. It is whatever `this` was in the scope where the object literal was written, which in a module is `undefined`. So `this.state` is `undefined` and `this.state.count` throws. The arrow captured the module `this`, not the object it is attached to.

Necessary fix, make it a regular method so the call site can supply `store` as the receiver:

```js
const store = {
  state: { count: 0 },
  listeners: [],
  dispatch(action) {
    this.state.count += action.amount;
    this.listeners.forEach((l) => l());
  },
  subscribe(fn) { this.listeners.push(fn); },
};
store.dispatch({ amount: 1 }); // works: this === store
```

Why that is necessary but not sufficient: turning `dispatch` into a regular method fixes the direct call `store.dispatch(...)`, but the requirement is that `dispatch` also be safe to pass as a callback. The moment someone writes `emitter.on("tick", store.dispatch)` or `store.subscribe(store.dispatch)`, the method is detached and called bare, and `this` is `undefined` again, the exact original crash. A regular function alone does not survive detachment.

To make it both correct and passable, pin the receiver:

```js
store.dispatch = store.dispatch.bind(store);
// now store.subscribe(store.dispatch) and emitter.on("tick", store.dispatch) both work
```

Note the inner `this.listeners.forEach((l) => l())` uses an arrow deliberately and correctly: that arrow captures `dispatch`'s `this` (the store), which is exactly what an inner callback should do. This is the two-sided rule in one function: a regular function for the method so it can receive the store, and an arrow for the inner callback so it inherits that same store. Swapping either one breaks it, and understanding why is the whole point of `this` binding.

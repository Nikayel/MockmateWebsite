> Module **0.3** (What async/await Actually Does) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [0.2](./l0-task-queues.md) · Next: [1.1](./l1-closures-capture.md)

# L0 · What async/await Actually Does

`async`/`await` is not a pause button for your program. It is compiler sugar over promises and the microtask queue. After this module you will be able to catch the three bugs that come from believing the sugar: reading state one tick too early, assuming a bare `await` is synchronous, and wrapping a floating async call in a `try/catch` that can never fire.

### ajr-l0-await-desugar-suspension: await splits the function and yields to the caller

- **id:** `ajr-l0-await-desugar-suspension`  ·  **difficulty:** medium  ·  **est:** 14 min  ·  **demo:** js-runnable  ·  **skills:** async-await, microtasks, control-flow

#### Learn

An `async` function runs synchronously right up until it hits its first `await`. At that point the function does not "block" and it does not "sleep". It splits. Everything before the `await` has already run on the caller's stack. Everything after the `await` is packaged into a continuation and scheduled as a microtask. Control then returns to the caller synchronously, as if the async function had returned a pending promise (because it did).

Look at the shape that trips people up:

```js
async function f() {
  console.log("a");
  await g();          // <- function suspends HERE, returns to caller
  console.log("b");   // <- this line is the continuation, runs on a later tick
}

f();
console.log("c");
```

The log order is `a`, `c`, `b`. Not `a`, `b`, `c`. When you call `f()`, it logs `a`, reaches `await g()`, and hands a pending promise back to the caller. The caller keeps going and logs `c`. Only after the current synchronous run finishes and the microtask queue is drained does `console.log("b")` run.

The mechanism to hold in your head: `await x` is roughly `Promise.resolve(x).then(() => <rest of the function>)`. The "rest of the function" is a callback. Callbacks do not run now, they run when the scheduler gets back to them. So any statement physically below an `await` is deferred, and any statement in the caller physically after the call runs first.

This is where the real bug lives. Consider a class method that sets state after an await:

```js
class Loader {
  data = null;
  async load() {
    await fetchThing();   // suspends
    this.data = 42;       // runs a tick later
  }
}

const l = new Loader();
l.load();
console.log(l.data);      // null, NOT 42
```

The assignment `this.data = 42` is in the continuation. `console.log(l.data)` runs synchronously right after the call, before the continuation. So you read `null`, then swear "but I just set it".

**Interview nuance:** "does `await` block the thread?" No. It only suspends the one async function it is inside. The rest of the program (the caller, the event loop, other tasks) keeps running. Saying "await pauses execution" is imprecise. It pauses this function and yields everything else.

**Interview nuance:** the `.then` desugaring is a model, not the literal bytecode. Engines implement `await` with a resumable stack frame, and native promises are optimized so the continuation costs one microtask tick, not the extra ticks a hand-written `.then` chain used to imply. The ordering the model predicts is still correct.

Recap: an `async` function runs to its first `await` synchronously, then yields to the caller and schedules the remainder as a microtask. Code after the call runs before code after the await.

#### See it live

**Demo (js-runnable):** an `async f()` that logs `a`, awaits, logs `b`, called beside a caller that logs `c`, next to the hand-desugared `.then` form, so you can watch control leave the function at `await` and resume at `b` on the next tick.

```js
// A) async/await form
async function fAsync() {
  console.log("A: a (inside f, before await)");
  await Promise.resolve();
  console.log("A: b (continuation, later tick)");
}
console.log("A: -- calling f --");
fAsync();
console.log("A: c (caller, right after f())");

// B) hand-desugared .then form (same control flow)
function fDesugared() {
  console.log("B: a (inside f, before .then)");
  return Promise.resolve().then(() => {
    console.log("B: b (the .then callback, later tick)");
  });
}
// Run B after A's microtasks so the two blocks do not interleave in the log
setTimeout(() => {
  console.log("B: -- calling f --");
  fDesugared();
  console.log("B: c (caller, right after f())");
}, 0);
```

**Watch:** in both blocks the console prints `a`, then `c`, then `b`. The `b` line (everything after `await`, or inside `.then`) never prints between `a` and `c`. That is control jumping OUT to the caller at the suspension point and only resuming `b` once the synchronous run is done and the microtask queue drains. The two variants match line for line, which proves `await` is the `.then` callback wearing nicer syntax.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Predict the exact order of `a`, `b`, `c` for `async function f(){ log(a); await g(); log(b) } f(); log(c)`, and mark exactly where the function suspended and where control went at that moment.

**Think about:**
- At the first await, where does control go?
- When does the code after await run?
- Is state set after await visible to code that ran right after the call?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The order is `a`, `c`, `b`.

Walk the runtime step by step. `f()` is called on the caller's stack. It logs `a`. It reaches `await g()`. At that exact point `f` suspends: it wraps `g()`'s result in a promise, schedules "log `b`" as the continuation, and returns a pending promise to the caller. Control goes back to the caller synchronously. The caller's next statement, `log(c)`, runs, printing `c`. The synchronous run finishes. Now the microtask queue is drained and the continuation fires, printing `b`.

The suspension point is the `await` keyword. Control went to the caller, one line below the `f()` call.

Here is the state-visibility trap the same mechanism creates, and the fix:

```js
// BROKEN: reads state before the continuation sets it
async function f() {
  await g();
  window.result = 42;   // continuation, later tick
}
f();
console.log(window.result); // undefined

// FIXED: read the value where it is actually available: after the await resolves
async function main() {
  await f();                 // now we wait for f's promise to settle
  console.log(window.result); // 42
}
main();
```

Why at the mechanism level: `await` posts the rest of the function as a microtask. Any code after the call site runs before that microtask. So state written after an `await` is not visible to code that ran synchronously right after the call. To read it, you must `await` the returned promise so your read is itself scheduled as a later continuation.

How to spot it in review: a caller that reads a field, ref, or module variable immediately after invoking an async function without awaiting it. The tell is "call, then read the result on the very next line".

Production symptom: values read one tick too early. You see `undefined` or a stale value "but I just set it", and it is flaky because a faster await can sometimes win the race in a passing test.

Common misconception to correct: `await` does not pause the whole program. It suspends only the current async function and yields to everything else. The caller is not frozen, it runs to completion before the continuation.

**Self-check rubric:**
- [ ] I predicted `a`, `c`, `b` (not `a`, `b`, `c`).
- [ ] I named the `await` keyword as the suspension point.
- [ ] I said control returned to the caller synchronously.
- [ ] I explained code after the await runs as a microtask.
- [ ] I connected this to reading post-await state one tick too early.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Debug the "cart total flashes zero" bug. On an e-commerce product page, `addToCart(item)` is an async method that fetches pricing then sets `this.total`. A click handler calls `this.addToCart(item)` and, on the next line, calls `this.renderTotal()` which reads `this.total`. Users see the total render as `0`, then correct itself only after another interaction. Explain the race and rewrite the handler so the total is correct on first render.

**Model answer (revealed on demand):**

The handler does not await the async method, so `renderTotal()` reads `this.total` before the continuation inside `addToCart` has run.

```js
// BROKEN
handleClick(item) {
  this.addToCart(item);   // suspends at its first await, returns a pending promise
  this.renderTotal();     // runs NOW, this.total is still 0
}

async addToCart(item) {
  const price = await fetchPrice(item);  // suspend
  this.total += price;                   // continuation, later tick
}
```

`addToCart` runs synchronously to `await fetchPrice(item)`, then returns a pending promise. `handleClick` ignores that promise and immediately calls `renderTotal()`, which reads the still-zero `total`. The `this.total += price` line is a microtask that has not run yet. The total only looks right later because the next interaction triggers a re-render after the continuation has finally landed.

Fix: make the handler await, so the render is itself scheduled after the total is set.

```js
// FIXED
async handleClick(item) {
  await this.addToCart(item); // wait for the continuation that sets this.total
  this.renderTotal();         // now reads the updated total
}
```

Mechanism: awaiting `addToCart` turns `renderTotal()` into a continuation of `handleClick`, so it runs after `this.total += price`, not before.

How to spot it in review: any UI update placed on the line after an un-awaited async mutation. Production symptom: a value that "flashes wrong then corrects", which is a classic one-tick-early read. Do not paper over it with a `setTimeout(renderTotal, 0)`. That happens to work by racing the microtask but breaks the moment the async work takes more than a tick. Await the promise instead.

### ajr-l0-await-always-yields: await always yields, even on a non-promise

- **id:** `ajr-l0-await-always-yields`  ·  **difficulty:** hard  ·  **est:** 12 min  ·  **demo:** js-runnable  ·  **skills:** async-await, microtasks

#### Learn

The previous lesson used `await g()` where `g` returns a promise, so the yield felt natural. Here is the surprise: `await` yields even when there is nothing to wait for. `await 5`, `await "done"`, `await Promise.resolve(1)` all defer the rest of the function to a microtask. The operand's type does not matter. The `await` keyword itself is what inserts the tick.

```js
console.log(1);
(async () => {
  await 0;          // no promise, still yields
  console.log(3);
})();
console.log(2);
```

The order is `1`, `2`, `3`. Remove the `await 0` line and the async body becomes fully synchronous, so the order is `1`, `3`, `2`. The single `await 0` is the entire difference. It takes `console.log(3)` and schedules it as a microtask, letting `console.log(2)` in the outer code run first.

Why does a bare value still yield? Because the spec defines `await x` as, roughly, `Promise.resolve(x)` followed by scheduling the continuation. `Promise.resolve` wraps any value in a promise, and a promise's continuation always runs on the microtask queue, never synchronously. So even `await 0` costs you exactly one detour through the scheduler.

**Interview nuance:** how many microtask ticks does `await` cost? On a native already-resolved promise, modern V8 (and the ES2019 spec change it standardized) costs one tick. Older engines, or awaiting a custom thenable, cost more, because a user-defined `then` has to be called via an extra job. This is why a custom thenable can lose an ordering race to a native promise: the native path was optimized to skip intermediate ticks the thenable path still pays.

```js
// A native promise resumes before a chain that pays extra thenable ticks.
Promise.resolve().then(() => console.log("native then"));

const slowThenable = { then(res) { res(); } };
(async () => { await slowThenable; console.log("after thenable"); })();
// "native then" prints before "after thenable"
```

The practical takeaway: never reason about micro-ordering as if `await` on a plain value is free or synchronous. If two pieces of code both look "immediate" but one has an `await` above it, the awaited one runs later. Adding or removing an `await` silently reorders your program by a tick, and that tick is enough to change which value another handler observes.

**Interview nuance:** this is also why `return await x` and `return x` inside an async function historically differed by a tick and by stack-trace quality. Engines have since optimized `return await` on native promises, but the mental model stays: `await` is a scheduling point, not a no-op.

Recap: `await` always defers the continuation to a microtask, even on a non-promise. It costs one tick on native promises and can cost more on custom thenables, so ordering-sensitive code must account for every `await` as an invisible yield.

#### See it live

**Demo (js-runnable):** `log(1)`, then an IIFE that `await 0` and logs `3`, then `log(2)`, shown with the `await` present and again with it removed, plus a counter of how many microtask turns elapsed.

```js
let microtaskTurns = 0;
function bumpTurn(label) {
  Promise.resolve().then(() => { microtaskTurns++; });
  return label;
}

// A) WITH await 0  -> expect 1, 2, 3
console.log("A: 1");
(async () => {
  await 0;                       // yields to a microtask even though 0 is not a promise
  console.log("A: 3 (after await)");
})();
console.log("A: 2");

// B) WITHOUT await  -> expect 1, 3, 2 (body is now synchronous)
setTimeout(() => {
  console.log("B: 1");
  (() => {
    // no await: this runs synchronously, in-line
    console.log("B: 3 (no await, synchronous)");
  })();
  console.log("B: 2");
}, 0);

// Tick counter: how many microtask turns did one `await 0` cost?
(async () => {
  const t0 = performance.now();
  await 0;
  const t1 = performance.now();
  console.log(`await 0 still deferred; elapsed ${(t1 - t0).toFixed(3)}ms, one microtask turn`);
})();
```

**Watch:** variant A prints `1`, `2`, `3`: the single `await 0` pushed `3` behind `2`. Variant B, with the `await` removed, prints `1`, `3`, `2` because the body is now synchronous. The only change is the `await`, which proves the yield comes from the keyword, not from waiting on anything. The timing line confirms the continuation resumes on a later microtask turn, not inline.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Predict the order of `log(1); (async()=>{ await 0; log(3) })(); log(2)`, then explain why removing the `await` changes the order.

**Think about:**
- Does await on a plain number still defer?
- How many microtask ticks does await on a native promise cost today?
- Why can a custom thenable lose an ordering race to a native promise?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

With the `await`, the order is `1`, `2`, `3`. Without it, the order is `1`, `3`, `2`.

Step through the awaited version. `log(1)` runs. The async IIFE is invoked and runs synchronously up to `await 0`. `await 0` wraps `0` in a resolved promise and schedules `log(3)` as a microtask, then returns control. `log(2)` runs in the outer synchronous code. The synchronous run ends, the microtask queue drains, and `log(3)` finally runs.

Remove the `await` and there is no suspension point:

```js
// no await: the whole body is synchronous
log(1);
(() => { log(3); })();  // runs inline
log(2);
// order: 1, 3, 2
```

Why at the mechanism level: `await x` is defined as `Promise.resolve(x)` plus a scheduled continuation. `Promise.resolve` accepts any value, so even `await 0` produces a resolved promise, and a promise continuation is always a microtask, never synchronous. The keyword, not the operand, creates the yield.

Ticks today: awaiting a native, already-resolved promise costs one microtask turn. The ES2019 change and V8's optimization removed the extra intermediate turns older engines paid. A custom thenable still costs more, because the engine has to enqueue an extra job to call your user-defined `then`. That is why a native promise's continuation can run before a thenable's even when the thenable was reached first: the native path skips ticks the thenable path pays.

How to spot it in review: micro-ordering assumptions that break when someone adds an `await`, for example "these two callbacks fire in write order" when one is now behind an await. Production symptom: subtle one-tick-late reads, where an event handler observes a value just before an awaited update lands, only under certain input timing.

Common misconception to correct: that `await` on an already-resolved value is synchronous, or, from older docs, that it always costs three ticks. Neither holds. It always yields (not synchronous), and on native promises modern engines cost one tick (not three).

**Self-check rubric:**
- [ ] I predicted `1`, `2`, `3` with await and `1`, `3`, `2` without.
- [ ] I said `await 0` still yields even though `0` is not a promise.
- [ ] I named `Promise.resolve` wrapping plus microtask scheduling as the cause.
- [ ] I said native promise await costs one tick today, not three.
- [ ] I explained a thenable can lose the race because of an extra job.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Diagnose the "analytics event fires in the wrong order" bug. In a checkout flow, two logging helpers run back to back: `logStepStart()` (plain synchronous) and `logStepEnd()` which someone refactored to `async` and left a `await featureFlag()` at the top even though the flag is already cached in memory. QA reports the `end` event sometimes lands before an unrelated `pageUnload` event that used to come after. Explain the reordering and fix it without dropping the flag check.

**Model answer (revealed on demand):**

The `await featureFlag()` at the top of `logStepEnd` inserts a microtask yield even though the flag is cached and returns instantly. That yield pushes the rest of `logStepEnd` behind whatever synchronous code, including the `pageUnload` scheduling, runs after the call.

```js
// BROKEN: await on a cached value still yields, reordering the event
async function logStepEnd() {
  const on = await featureFlag();     // flag is cached, but await still defers
  if (on) send("step_end");           // now a microtask behind later sync code
}
logStepEnd();
scheduleUnload();                      // runs before send("step_end")
```

Because `featureFlag()` resolves immediately, developers assume `logStepEnd` is effectively synchronous. It is not. `await` on the cached promise defers everything after it by a microtask turn, so `send("step_end")` runs after `scheduleUnload()`, flipping the observed order.

Fix: read the cached flag synchronously so there is no yield, and keep the async signature only where a real await is needed.

```js
// FIXED: no await on a value that is already in memory
function logStepEnd() {
  const on = featureFlagSync();   // read the cached value synchronously
  if (on) send("step_end");
}
```

If the flag genuinely can be uncached, keep the await but make the ordering explicit by awaiting `logStepEnd()` before scheduling unload, so the sequence is intentional rather than a race:

```js
await logStepEnd();
scheduleUnload();
```

Mechanism: `await` is a scheduling point regardless of whether the operand is already resolved, so an "instant" await still reorders by one tick. How to spot it in review: an `await` on something known to be synchronous or cached, added during an async refactor. Production symptom: events, logs, or renders that emit in the wrong order intermittently, especially near teardown or navigation where ordering matters. The misconception to kill: "the promise is already resolved so the await is free". It is not free, it costs a tick.

### ajr-l0-floating-promise-errors: Floating promises and error handling across await

- **id:** `ajr-l0-floating-promise-errors`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** js-runnable  ·  **skills:** error-handling, promises, async-await

#### Learn

A `try/catch` catches two things: a synchronous `throw`, and the rejection of a promise you actually `await` inside the `try`. It does not catch the rejection of a promise you started but never awaited. That un-awaited promise is a floating promise, and when it rejects it surfaces later as an unhandled rejection that your `try/catch` never sees.

Here is the exact trap:

```js
async function doAsync() {
  throw new Error("boom");   // becomes a rejected promise
}

try {
  doAsync();                 // NOT awaited: returns a rejected promise, no sync throw
} catch (e) {
  handle(e);                 // never runs
}
```

`doAsync()` does not throw synchronously. Because it is `async`, its `throw` becomes a rejected promise that it returns. The `try` block finishes normally (it saw no synchronous throw), so the `catch` is skipped. The rejected promise then floats off with no handler and fires an unhandled rejection on a later tick.

The fix is to make the rejection something the `try` can see, which means turning it into a synchronous-looking throw at the `await` point:

```js
try {
  await doAsync();   // await re-throws the rejection right here
} catch (e) {
  handle(e);         // now runs
}
```

`await` on a rejected promise throws inside the async function at the continuation point, so the surrounding `try/catch` catches it exactly like a normal throw. The second fix, when you cannot await (for example a fire-and-forget side effect), is to attach a `.catch`:

```js
doAsync().catch(handle);   // handles the rejection where it lives, off the try/catch
```

**Interview nuance:** where does an unhandled rejection actually surface? In the browser it fires `window.onunhandledrejection` and logs a console error, but the app keeps running, so the error is effectively swallowed from the user flow. In Node, an unhandled rejection terminates the process by default on modern versions. Same bug, two very different blast radii: silent data loss in the browser, a crash in the server.

**Interview nuance:** the danger zones are handlers, effects, and loops. An `onClick={() => doAsync()}` or a `useEffect(() => { doAsync() }, [])` starts a promise nobody awaits. A `for (const x of items) doAsync(x)` fires a batch of floating promises. None of them are covered by an outer `try/catch`.

Recap: `try/catch` only catches synchronous throws and rejections of promises you actually `await`. A floating async call rejects on its own later, bypassing the `try/catch`, so either `await` it inside the `try` or attach a `.catch`.

#### See it live

**Demo (js-runnable):** two paths, a fire-and-forget rejecting promise versus an awaited rejecting promise, both wrapped in the same `try/catch` and both observed by a global unhandled-rejection listener, so you can see which one the `catch` sees and which one escapes.

```js
// Global listener stands in for window.onunhandledrejection / process 'unhandledRejection'
if (typeof process !== "undefined" && process.on) {
  process.on("unhandledRejection", (reason) => {
    console.log(`>> UNHANDLED REJECTION banner: ${reason.message}`);
  });
} else if (typeof addEventListener !== "undefined") {
  addEventListener("unhandledrejection", (ev) => {
    console.log(`>> UNHANDLED REJECTION banner: ${ev.reason.message}`);
    ev.preventDefault();
  });
}

function rejectSoon(label) {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(label)), 10)
  );
}

// A) FLOATING: not awaited. try/catch cannot see it.
async function floating() {
  try {
    rejectSoon("A floating");        // no await
    console.log("A: try block finished, catch was skipped");
  } catch (e) {
    console.log(`A: caught ${e.message}`); // never prints
  }
}

// B) AWAITED: try/catch catches it cleanly.
async function awaited() {
  try {
    await rejectSoon("B awaited");    // await re-throws here
  } catch (e) {
    console.log(`B: caught cleanly -> ${e.message}`);
  }
}

floating();
awaited();
```

**Watch:** variant B prints `B: caught cleanly -> B awaited`, and no banner fires for it, because `await` turned the rejection into a throw the `catch` handled. Variant A prints `A: try block finished, catch was skipped` and then, on a later tick, the `>> UNHANDLED REJECTION banner: A floating` line fires from the global listener. The `catch` in A never runs. That contrast proves the `try/catch` only covers the awaited rejection, and the floating one escapes to the global handler.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Explain why the `catch` in `try { doAsync() } catch(e){ handle(e) }` never fires when `doAsync` is `async`, then fix it two ways and say which fix fits which situation.

**Think about:**
- What does try/catch actually catch here?
- Where does the rejection surface if you do not await?
- How does await turn a rejection into something catchable?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The `catch` never fires because `doAsync()` does not throw synchronously. As an `async` function, its internal `throw` (or any rejection) becomes a rejected promise that it returns. Since you did not `await` it, the `try` block sees no synchronous throw, completes normally, and skips the `catch`. The rejected promise then floats away and surfaces later as an unhandled rejection, far outside this `try/catch`.

Fix one, await inside the try. Use this when you are already in an async function and want to handle the error in local flow:

```js
try {
  await doAsync();   // await re-throws the rejection at this line
} catch (e) {
  handle(e);
}
```

Fix two, attach a `.catch`. Use this for fire-and-forget calls where you cannot or do not want to await, such as a side effect in a sync handler:

```js
doAsync().catch(handle);   // handles the rejection on the promise itself
```

Why at the mechanism level: a `try/catch` only intercepts synchronous throws on the current stack and rejections of promises you `await` (because `await` on a rejected promise re-throws inside the async function at the continuation point, putting the throw back on a stack the `catch` guards). A floating promise settles on a later tick with no handler attached, so nothing on the `try` stack is there to catch it.

How to spot it in review: async calls invoked without `await` and without `.catch`, especially inside event handlers, `useEffect` bodies, `.forEach`/`.map` callbacks, and loops. The tell is an async function called as a bare statement.

Production symptom: in the browser, swallowed errors, the user sees nothing happen and no error bubbles into your flow while the console quietly logs an unhandled rejection. In Node, a crashed process, because modern Node terminates on unhandled rejection by default.

Common misconception to correct: that a `try/catch` around a non-awaited async call catches its rejection. It does not. The `try/catch` guards the synchronous execution of the block, and the call returned before the rejection existed.

**Self-check rubric:**
- [ ] I said `doAsync()` returns a rejected promise instead of throwing synchronously.
- [ ] I explained the try block completes normally so catch is skipped.
- [ ] I gave the `await doAsync()` fix and the `.catch(handle)` fix.
- [ ] I said which fix fits awaited flow versus fire-and-forget.
- [ ] I named the browser (swallowed) versus Node (crash) symptom.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Fix the "some uploads silently vanish" bug. A batch uploader runs `for (const file of files) { try { uploadOne(file) } catch (e) { markFailed(file) } }` where `uploadOne` is `async`. In production, failed uploads are neither retried nor marked failed, and Node's error monitor occasionally reports the process restarting. Rewrite the loop so every rejection is handled, and say why the original try/catch caught nothing.

**Model answer (revealed on demand):**

The original loop never awaits `uploadOne(file)`, so each call returns a promise that the `try/catch` cannot see. Every iteration fires a floating promise, the `try` completes normally, and `markFailed` never runs. When one rejects, it surfaces as an unhandled rejection, which in Node can restart the process.

```js
// BROKEN: floating promise per iteration, catch never fires
for (const file of files) {
  try {
    uploadOne(file);          // not awaited
  } catch (e) {
    markFailed(file);         // dead code for async rejections
  }
}
```

Fix, sequential and awaited. Each `await` re-throws its rejection into the `try`, so `markFailed` runs per file:

```js
for (const file of files) {
  try {
    await uploadOne(file);    // rejection re-thrown here, caught below
  } catch (e) {
    markFailed(file);
  }
}
```

If you need concurrency, keep the per-item `catch` on each promise so no rejection floats, then wait for all:

```js
await Promise.all(
  files.map((file) =>
    uploadOne(file).catch((e) => markFailed(file))  // handled per promise
  )
);
```

Note `Promise.all` rejects on the first failure, which is why each item must carry its own `.catch`; otherwise the first rejection both aborts the wait and leaves the rest floating. `Promise.allSettled` is the alternative when you want every result regardless.

Mechanism: `await` (or `.catch`) is what converts a promise rejection into something a handler can intercept. A bare async call in a loop leaves a rejection with no owner. How to spot it in review: `async` functions called without `await` or `.catch` inside `for`, `forEach`, or `map`. Production symptom: silently dropped work in the browser and process restarts in Node, both intermittent because they depend on which uploads fail. Misconception to kill: wrapping the loop body in `try/catch` is enough. It is not, unless you actually `await` inside it.

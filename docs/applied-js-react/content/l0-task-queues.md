> Module **0.2** (Microtasks vs Macrotasks) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [0.1](./l0-call-stack-event-loop.md) · Next: [0.3](./l0-async-await-desugar.md)

# L0 · Microtasks vs Macrotasks

The event loop does not treat all "async" work the same: promise callbacks and `queueMicrotask` land in a microtask queue that is fully drained after every single task, while `setTimeout`, message events, and I/O callbacks wait in the task (macrotask) queue behind rendering. After this module you can predict the exact interleaving of sync code, promises, timers, `requestAnimationFrame`, and Node's `process.nextTick`/`setImmediate`, and you can catch the ordering bugs (read-after-write races, frozen tabs, layout thrash, stalled Node servers) that come from getting it wrong.

### ajr-l0-two-queues-ordering: The ordering law: drain all microtasks before the next task

- **id:** `ajr-l0-two-queues-ordering`  ·  **difficulty:** medium  ·  **est:** 14 min  ·  **demo:** js-runnable  ·  **skills:** event-loop, microtasks, ordering

#### Learn

There is one rule that explains most "why did this log in that order" surprises: the event loop runs exactly one task (macrotask), then drains the **entire** microtask queue to empty before it will ever pick up the next task. Not one microtask. All of them, including any microtasks that get queued while it is draining.

The two queues are fed by different sources. The microtask queue receives promise reactions (`.then`, `.catch`, `.finally`, and the continuation after an `await`), `queueMicrotask(fn)` callbacks, and `MutationObserver` records. The task queue receives `setTimeout`/`setInterval` callbacks, DOM events, `MessageChannel`/`postMessage` messages, and network/I/O completions.

Consider this snippet:

```js
console.log('A');
setTimeout(() => console.log('B'), 0);
Promise.resolve().then(() => console.log('C'));
queueMicrotask(() => console.log('D'));
console.log('E');
```

The current running script is itself a task. Its synchronous body runs top to bottom, so `A` then `E` log first. During that run, `B` is placed on the task queue and `C` and `D` are placed on the microtask queue. The script finishes, the stack empties, and now the loop drains microtasks: `C` then `D` (FIFO in the order they were queued). Only when the microtask queue is empty does the loop take the next task, `B`. Output: `A, E, C, D, B`.

The subtle part is what happens if a microtask queues another microtask. Say `C`'s callback did `queueMicrotask(() => console.log('C2'))`. That new microtask is added to the same queue that is currently draining, so it runs in this same drain, before `B`. The loop does not "cut the line" at some snapshot; it keeps going until the queue is genuinely empty. That is exactly the mechanism that enables microtask starvation (next lesson).

**Interview nuance:** the popular phrasing "microtasks have higher priority than macrotasks" is a useful shorthand but it hides the real rule. It is not a priority number, it is a structural guarantee: the microtask checkpoint runs to completion after every task. A `setTimeout(fn, 0)` scheduled before a promise resolves still runs after that promise's `.then`, because the timer is a task and the promise callback is a microtask drained first.

**Interview nuance:** `setTimeout(fn, 0)` never runs "immediately." At minimum it yields to the current task boundary, then waits behind the whole microtask drain and often behind rendering. If you need "run this after current synchronous code but before paint," the primitive is `queueMicrotask`, not `setTimeout`.

Recap: one task, then a full microtask drain (including freshly-queued microtasks), then the next task. Synchronous code first, then all microtasks, then the timer.

#### See it live

**Demo (js-runnable):** logs `A`, schedules `setTimeout(B)`, `Promise.then(C)`, `queueMicrotask(D)`, then logs `E`, and prints the resulting order.

```js
// Ordering law: sync -> all microtasks -> next task
const order = [];
const log = (label) => order.push(label);

log('A');                                   // sync
setTimeout(() => log('B'), 0);              // task queue
Promise.resolve().then(() => log('C'));     // microtask queue
queueMicrotask(() => log('D'));             // microtask queue
log('E');                                   // sync

// Bonus: a microtask queued DURING the drain still runs before B.
Promise.resolve().then(() => {
  queueMicrotask(() => log('C2 (queued during drain)'));
});

// setTimeout below fires after the whole microtask queue is empty,
// so it reports the final order once every microtask has run.
setTimeout(() => console.log('FINAL ORDER:', order.join(', ')), 10);
```

**Watch:** the console fills `A, E` immediately (synchronous), then `C, D`, then `C2`, and only then `B`. The three-lane visualizer shows tokens `C`, `D`, and the drain-queued `C2` all leaving the Microtask lane before token `B` ever leaves the Task lane. That proves the microtask queue drains fully, including microtasks born mid-drain, before the timer task runs.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Predict the exact output order of a snippet mixing synchronous logs, `setTimeout`, `Promise.then`, and `queueMicrotask`, and for each callback name which queue it lands in and why it runs when it does.

**Think about:**
- Which log is guaranteed first and why?
- Do microtasks queued during the drain also run before the next macrotask?
- What sources feed each queue?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

For the snippet in "See it live" the order is `A, E, C, D, C2 (queued during drain), B`.

Why, at the event-loop level: the currently executing script is a single task. Its synchronous statements run first with nothing able to interrupt them, so `A` and `E` log before anything async. While that task runs, `setTimeout` puts `B` on the **task queue**, and both `Promise.resolve().then` and `queueMicrotask` put `C` and `D` on the **microtask queue**. When the synchronous script returns and the call stack is empty, the loop performs the microtask checkpoint: it dequeues and runs microtasks until the queue is empty. `C` runs, then `D`. `C`'s callback itself calls `queueMicrotask`, adding `C2` to the same queue mid-drain, so the checkpoint keeps going and runs `C2` too. Only when the microtask queue is truly empty does the loop advance to the next task and run `B`.

How to spot it in review: look for code that schedules a `setTimeout(fn, 0)` and then reasons "this runs after my promise resolves." Any assumption that `setTimeout(0)` beats a pending promise callback is backwards. Also flag reasoning that treats "queued a microtask" as a single-callback deferral; a `.then` that queues more work extends the current drain.

Production symptom: state read-after-write races. A component writes state in a promise callback and a `setTimeout(0)` reads it (or vice versa), and the value is stale or fresh depending on which queue won, producing "it logs the old value" bugs that are painful because they look nondeterministic but are actually fully specified.

Common misconception corrected: `setTimeout(fn, 0)` does not run immediately and does not run "as soon as the stack clears." The stack clearing triggers the microtask drain first; the timer waits behind all of it.

**Self-check rubric:**
- [ ] I put both synchronous logs before any async callback.
- [ ] I placed promise and `queueMicrotask` callbacks in the microtask queue and `setTimeout` in the task queue.
- [ ] I ran the full microtask drain before the timer.
- [ ] I accounted for a microtask queued during the drain running in that same drain.
- [ ] I named the read-after-write race as the production symptom.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Analytics double-fire. In a checkout page, `trackEvent('purchase')` schedules its network send with `setTimeout(send, 0)` to "not block the click handler." A teammate adds optimistic UI that resolves a promise and, in its `.then`, calls `trackEvent('purchase')` again with a dedupe guard `if (!sent) { sent = true; send(); }`. In production the event sometimes fires twice. Predict the ordering that causes the double-fire and rewrite the scheduling so the guard is reliable.

**Model answer (revealed on demand):**

The bug is that the guard is set in a microtask but the first send is scheduled as a task, so the guard has not run yet when the loop is still draining microtasks. Timeline: the click handler runs (a task), calls the original `trackEvent`, which does `setTimeout(send, 0)` and puts send #1 on the task queue with `sent` still `false`. The handler returns. The loop drains microtasks: the optimistic-UI `.then` runs, sees `sent === false`, sets `sent = true`, and calls `send()` synchronously (send #2). The microtask queue empties. Only now does the loop pick up the `setTimeout` task, run send #1, and because the guard lives in the wrong scheduling tier it either fires again or was checked too early. The two sends live in different queues, so the guard never protects both.

Fix: put both paths on the same tier and guard once. The cleanest version schedules the dedup on the microtask tier (or does it synchronously) so ordering is deterministic:

```js
let scheduled = false;
function trackEvent(name) {
  if (scheduled) return;      // guard runs in the same tier as the send
  scheduled = true;
  queueMicrotask(() => {      // deterministic: drains before the next task
    scheduled = false;
    send(name);
  });
}
```

Mechanism: by moving the send to `queueMicrotask`, both the original call and the optimistic `.then` call resolve within the same microtask drain, so the second call sees `scheduled === true` and bails. Using `setTimeout` split the two calls across the microtask/task boundary, which is why the guard raced. Spot it in review whenever a dedupe flag is set in a promise callback but the guarded work is scheduled with `setTimeout`. Production symptom: duplicated analytics, double POSTs, and double toasts that only reproduce when an unrelated promise happens to resolve in the same turn.

### ajr-l0-promise-vs-settimeout: All microtasks beat the next timer

- **id:** `ajr-l0-promise-vs-settimeout`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** js-runnable  ·  **skills:** microtasks, promises, ordering

#### Learn

A common trap is to schedule a `setTimeout(fn, 0)` "to wait for a promise to settle." It never works, and the reason is the ordering law from the previous lesson taken to its logical end: **however long the promise chain is, it still finishes before one timer that was scheduled first.**

Look at the canonical snippet:

```js
setTimeout(() => console.log(1), 0);
Promise.resolve()
  .then(() => console.log(2))
  .then(() => console.log(3));
console.log(4);
```

The output is `4, 2, 3, 1`. Synchronous `4` logs first. The `setTimeout` callback is a task; it sits in the task queue. `Promise.resolve().then(...)` queues the first `.then` (logging `2`) as a microtask. Here is the key move: `.then` returns a new promise, and its callback is only queued after the previous one runs. So when `2` runs during the microtask drain, it settles the intermediate promise, which queues the `3` callback as a fresh microtask **into the same drain that is still running.** The drain does not stop until the queue is empty, so `3` runs next, still before the loop ever advances to the timer task. Then, finally, `1`.

You can chain a hundred `.then`s. Each one re-enters the microtask queue as its predecessor settles, and every one of them drains before the loop takes the single `setTimeout` task. The timer literally cannot "sneak in" between two links of a promise chain, because links are microtasks and the timer is a task, and tasks only run when the microtask queue is empty.

**Interview nuance:** this is why `await` in a loop does not yield to timers between iterations by itself. Each `await` continuation is a microtask; a loop of awaits over already-resolved values just keeps refilling the microtask queue, and a `setTimeout(0)` scheduled before the loop still waits until the whole loop is done. If you actually need to yield to the browser (to paint, to run a timer, to keep the tab responsive), you need a macrotask or `scheduler.yield()`, not another `await`.

**Interview nuance:** do not use this ordering as a synchronization primitive. "I know my `.then` beats the `setTimeout` so I will rely on that order" is fragile because it couples correctness to how many microtasks other code happens to queue. Correct sequencing comes from data dependencies (awaiting the actual promise you care about), not from betting on queue tiers.

Recap: the microtask queue is emptied completely before any task, and each `.then` refills that queue as it settles, so a promise chain of any length finishes before a timer that was scheduled first. Output `4, 2, 3, 1`.

#### See it live

**Demo (js-runnable):** runs `setTimeout(log 1)`, a two-link `Promise.resolve().then(log 2).then(log 3)`, and synchronous `log 4`, then compares a longer chain against the same timer.

```js
const out = [];
const log = (n) => out.push(n);

// A) short chain: does the timer ever beat the promise links?
setTimeout(() => log('timeout(1)'), 0);
Promise.resolve()
  .then(() => log('then(2)'))
  .then(() => log('then(3)'));
log('sync(4)');

// B) long chain: 50 links, one timer scheduled BEFORE them.
setTimeout(() => log('timeout-B (fires last)'), 0);
let p = Promise.resolve();
for (let i = 0; i < 50; i++) {
  p = p.then(() => log('link-' + i));
}

// Report after both queues have fully drained.
setTimeout(() => console.log(out.join('\n')), 20);
```

**Watch:** the console shows `sync(4)` first, then `then(2)`, `then(3)`, and only afterward `timeout(1)`. In variant B every one of `link-0` through `link-49` prints before `timeout-B`, even though that timer was scheduled before the loop built the chain. The stepper's "predicted vs actual" panel flashes red if you guessed the timer would interleave, and you can watch the microtask lane visibly refill from each `.then` before the task lane ever advances.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Predict the order of `setTimeout(()=>log(1)); Promise.resolve().then(()=>log(2)).then(()=>log(3)); log(4)`, then explain why chaining more `.then` calls never lets the timer sneak in.

**Think about:**
- Why does a longer promise chain still finish before `setTimeout`?
- Is this ordering something you should rely on for synchronization?
- What re-enters the microtask queue on each `.then`?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The order is `4, 2, 3, 1`.

Mechanism: `4` is synchronous and runs while the current task executes. The `setTimeout` callback is queued as a task; the first `.then` is queued as a microtask. When the synchronous script finishes and the stack is empty, the loop runs the microtask checkpoint. `2` runs, which settles the promise returned by the first `.then`, which in turn queues the `3` callback as a **new microtask appended to the drain in progress.** The checkpoint keeps running until empty, so `3` runs. Only when no microtasks remain does the loop take a task and run `1`. Adding more `.then`s just adds more microtasks that each refill the queue as they settle; the timer, being a task, waits for all of them:

```js
// The timer can never appear between links, because links are microtasks
// and the timer is a task; tasks run only when microtasks are exhausted.
Promise.resolve()
  .then(() => log(2))   // microtask
  .then(() => log(3))   // queued when the previous link settles, same drain
  .then(() => log(3.5)); // still before any setTimeout scheduled earlier
```

How to spot it in review: search for `setTimeout(..., 0)` used as a "wait for the promise to be ready" hack, or comments like "give the promise a tick to settle." That is a coordination-by-queue-tier smell. The fix is to `await` (or `.then`) the actual promise whose result you need, so the dependency is explicit.

Production symptom: timing-dependent code that passes on one machine and reorders on another, or after a refactor that adds or removes a stray microtask. It presents as flaky tests and "works locally, fails in CI" bugs, because correctness was riding on incidental queue contents.

Common misconception corrected: `setTimeout(0)` is not a valid way to defer "until after a promise settles." It defers to a later task, which is strictly after the entire current microtask drain, so it can be much later than you want and it never gives you a guaranteed "right after this specific promise" hook.

**Self-check rubric:**
- [ ] I predicted `4, 2, 3, 1`.
- [ ] I explained that each `.then` queues its successor as a fresh microtask in the same drain.
- [ ] I stated that tasks run only when the microtask queue is empty.
- [ ] I said this ordering must not be used as a synchronization primitive.
- [ ] I named flaky/order-dependent behavior as the production symptom.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Test-flake hunt. A React data-loading test does `render(<Widget/>)`, then `await Promise.resolve()` "to let effects flush," then asserts the fetched list is on screen. It passes locally and fails intermittently in CI. The fetch is mocked to resolve immediately. Explain why a single `await Promise.resolve()` is not a reliable flush and give the correct wait.

**Model answer (revealed on demand):**

The single `await Promise.resolve()` only advances the microtask queue by roughly one drain from the test's perspective, but the component's data path usually involves several chained microtasks: the mocked fetch resolves, then a `.then` parses JSON (another microtask), then `setState` schedules a React update, and React's own work may be scheduled on a later microtask or even a task. One `await` does not guarantee all of those have settled, so whether the DOM is updated by the assertion line depends on exactly how many microtask hops the chain took, which is why it flakes.

Mechanism: awaiting a fresh resolved promise yields exactly once to the microtask checkpoint. Chained `.then`s each refill the queue, so a chain of depth N needs the checkpoint to run N times, not once. Betting on a fixed number of `await`s couples the test to the internal microtask depth of the code under test, which changes with refactors and library versions.

Fix: wait on the actual observable condition instead of a queue tier. With Testing Library:

```js
render(<Widget />);
// waits and retries until the assertion passes or times out
await screen.findByText('First item');
// or: await waitFor(() => expect(screen.getByRole('list')).toBeInTheDocument());
```

`findBy*`/`waitFor` poll across microtask and task boundaries until the DOM reflects the settled state, so they do not care how deep the promise chain is. Spot the anti-pattern in review whenever you see `await Promise.resolve()`, `await null`, or a hardcoded `await new Promise(r => setTimeout(r, 0))` used to "flush" async work before an assertion. Production symptom here is CI-only flake: the code is correct, but the test's synchronization assumed a specific microtask depth that does not hold under different timing or a slightly deeper chain.

### ajr-l0-microtask-starvation: Microtask starvation freezes the tab with no CPU loop

- **id:** `ajr-l0-microtask-starvation`  ·  **difficulty:** hard  ·  **est:** 14 min  ·  **demo:** js-runnable  ·  **skills:** microtasks, starvation, rendering

#### Learn

You can freeze a browser tab solid without ever writing a `for` loop or a `while (true)`. The trick, which shows up accidentally in real code, is a microtask that re-queues itself:

```js
function loop() {
  Promise.resolve().then(loop); // schedules another microtask, forever
}
loop();
```

This uses almost no CPU per iteration, yet the tab goes completely unresponsive: no rendering, no clicks, no scroll. Compare it to the timer version, which stays responsive:

```js
function loop() {
  setTimeout(loop, 0); // schedules another TASK, forever
}
loop();
```

The difference is the ordering law again. Rendering (style, layout, paint) and the next task can only happen **after the microtask queue is empty.** The promise version queues a new microtask from inside a microtask, so the checkpoint never reaches empty; it just keeps draining forever. The browser never gets to the point in the loop where it would render or pick up input events. The tab is not "busy" in the CPU sense, it is starved: the event loop is trapped inside an unending microtask drain.

The timer version is the opposite. Each `setTimeout(loop, 0)` schedules a **task**, not a microtask. The current task finishes, the (empty) microtask queue drains instantly, the browser is free to render and process input, and only then does the loop pick up the next `loop` task. So the UI keeps painting and stays clickable, even though the loop runs continuously.

**Interview nuance:** the same trap hides inside `await`. A recursive `async` function that `await`s and then calls itself with no macrotask break is just a self-requeuing microtask in disguise, because each `await` continuation is a microtask. So is `Promise.resolve().finally(loop)`. Reviewers should treat "recursion scheduled through any promise mechanism" as a potential starvation source, not just `.then`.

**Interview nuance:** the correct way to run a long job in chunks without freezing the UI is to yield to the macrotask tier between chunks. The modern primitive is `await scheduler.yield()` (or `scheduler.postTask`), which returns control to the loop so it can render and handle input before your next chunk. The classic fallback is to break the batch with a `setTimeout`/`MessageChannel` hop. What you must not do is chunk with `await Promise.resolve()`, because that stays on the microtask tier and starves rendering exactly like the bug above.

Recap: paint and the next task only occur when the microtask queue is empty; a microtask that re-queues itself keeps the queue non-empty forever and freezes the tab with no CPU loop. Break the recursion with a macrotask (or `scheduler.yield`) to let the browser render.

#### See it live

**Demo (js-runnable):** runs a bounded recursive `Promise.resolve().then(loop)` versus a bounded recursive `setTimeout(loop, 0)`, and reports how many "render opportunities" (task boundaries) each one allowed. Bounded so the worker can finish instead of truly hanging.

```js
// Bounded to N steps so the worker returns; the ratio is the lesson.
const N = 20;

function runMicrotaskLoop() {
  return new Promise((resolve) => {
    let steps = 0;
    let taskBoundaries = 0; // times control returned to a fresh TASK

    // A background timer can only fire when the queue is EMPTY (a task boundary).
    const probe = setInterval(() => { taskBoundaries++; }, 0);

    function loop() {
      if (steps++ >= N) {
        clearInterval(probe);
        return resolve({ mode: 'microtask', steps, taskBoundaries });
      }
      Promise.resolve().then(loop); // re-queues a MICROTASK
    }
    loop();
  });
}

function runTaskLoop() {
  return new Promise((resolve) => {
    let steps = 0;
    let taskBoundaries = 0;
    const probe = setInterval(() => { taskBoundaries++; }, 0);

    function loop() {
      if (steps++ >= N) {
        clearInterval(probe);
        return resolve({ mode: 'task', steps, taskBoundaries });
      }
      setTimeout(loop, 0); // re-queues a TASK, yielding between steps
    }
    loop();
  });
}

(async () => {
  const micro = await runMicrotaskLoop();
  console.log('A) microtask loop:', JSON.stringify(micro));
  const task = await runTaskLoop();
  console.log('B) setTimeout loop:', JSON.stringify(task));
  console.log('Note: microtask loop gives ~0 task boundaries during its run (starved); the setTimeout loop yields on every step.');
})();
```

**Watch:** the microtask-loop result reports roughly `taskBoundaries: 0`, meaning the interval probe never fired during its run, because the queue never emptied. The `setTimeout` version reports many boundaries, one per step. In the on-page version an animated counter and an FPS meter sit next to each loop: the microtask loop freezes the counter and drops FPS to 0, while the `setTimeout` loop keeps ticking. That proves the freeze comes from the queue never emptying, not from CPU work.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Predict which of `function loop(){ Promise.resolve().then(loop) } loop()` versus the `setTimeout` version lets an on-page counter keep updating and explain why, then show how to make a long promise chain yield.

**Think about:**
- Why does the promise version freeze the UI without a `for` loop?
- When can the browser paint relative to the microtask queue?
- How do you make a long chain yield?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The `setTimeout` version lets the counter keep updating; the `Promise.resolve().then(loop)` version freezes it.

Mechanism: the browser can only run style, layout, paint, and the next task when the microtask queue is empty. `Promise.resolve().then(loop)` queues a new microtask from inside a microtask, so the microtask checkpoint never reaches empty. The event loop is stuck in a perpetual drain, so it never advances to rendering or input handling. No `for` loop is involved; the CPU is barely working, but the loop is structurally trapped. The `setTimeout` version instead queues a **task** each iteration, so the current task ends, the empty microtask queue drains instantly, the browser paints and handles input, and then the next `loop` task runs.

Fix: break the recursion with a macrotask so the queue can empty between chunks. Prefer the scheduler API where available:

```js
async function chunkedWork(items) {
  for (let i = 0; i < items.length; i++) {
    process(items[i]);
    if (i % 500 === 0) {
      // yields to the loop: paint + input can happen before we continue
      await scheduler.yield?.() ?? new Promise((r) => setTimeout(r));
    }
  }
}
```

How to spot it in review: any recursion scheduled through `Promise.resolve().then`, `.finally`, or an `async` function that `await`s and then calls itself with no macrotask break. Treat "keeps scheduling itself on the microtask tier" as the red flag, not just literal loops.

Production symptom: a completely frozen tab that looks like an infinite loop, but the CPU profiler shows near-idle and there is no obvious `while`/`for`. Users report "the page hangs" and the "Wait / Kill page" dialog appears. It is especially nasty because it can be triggered by an accidental recursive `.then` deep in a library callback.

Common misconception corrected: only `for`/`while` loops can freeze the UI. A self-requeuing microtask freezes it just as hard with essentially no CPU spent, because the problem is scheduling, not computation.

**Self-check rubric:**
- [ ] I said the `setTimeout` version keeps the counter alive and the promise version freezes it.
- [ ] I explained paint/next-task require an empty microtask queue.
- [ ] I identified the self-requeuing microtask as the cause.
- [ ] I gave a macrotask (or `scheduler.yield`) break as the fix.
- [ ] I noted the CPU is near-idle during the freeze.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Streaming parser hang. A CSV importer reads a large string and, for backpressure, "yields" between rows with `await Promise.resolve()` before recursively processing the next row. On big files the tab freezes and the progress bar never moves, even though CPU is low. Diagnose why the yield does not yield and rewrite it to keep the UI responsive while staying fast.

**Model answer (revealed on demand):**

`await Promise.resolve()` does not yield to the browser; it yields to the microtask checkpoint, which the parser is already inside. Because each row schedules the next row through another microtask (`await` continuation), the microtask queue never empties, so the browser never gets to paint the progress bar or handle input. It is the starvation bug wearing a "backpressure" costume: low CPU, frozen UI, no `for` loop visible because the recursion is spread across `await` continuations.

Mechanism: an `await` continuation is a microtask. Awaiting an already-resolved promise just re-enters the same drain the parser is running in. Rendering requires the microtask queue to be empty, which never happens while rows keep queuing more microtasks. To actually let the browser paint, you must hop to the macrotask tier (or use the scheduler) at intervals.

Fix: yield to the loop on a cadence, and prefer time-slicing over per-row hops so you stay fast:

```js
async function importRows(rows) {
  let last = performance.now();
  for (let i = 0; i < rows.length; i++) {
    processRow(rows[i]);
    if (performance.now() - last > 8) {       // ~1 frame budget
      updateProgress(i / rows.length);
      await (scheduler.yield?.() ?? new Promise((r) => setTimeout(r)));
      last = performance.now();
    }
  }
}
```

This processes rows synchronously until it has used about 8ms, then yields a macrotask so the browser can paint the progress bar and stay clickable, then resumes. Spot the anti-pattern in review whenever `await Promise.resolve()`/`await null` is described as "yielding" or "backpressure." Production symptom: a hung tab on large inputs with an idle CPU and a progress bar stuck at 0 percent, which is doubly confusing because the work is obviously getting done (the import eventually completes if it does not get killed first), yet nothing renders until it finishes.

### ajr-l0-settimeout-zero-lies: setTimeout(0) lies: clamping, nesting, throttling

- **id:** `ajr-l0-settimeout-zero-lies`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** js-runnable  ·  **skills:** timers, throttling, scheduling

#### Learn

`setTimeout(fn, 0)` promises almost nothing about when `fn` runs. The delay you pass is a **minimum**, not a target, and the actual delay is shaped by three separate rules that surprise people.

First, ordering: as covered earlier, the callback is a task, so it waits behind the whole microtask drain and behind rendering. "0" never means "now."

Second, nested clamping. The HTML spec says that once you are five or more levels deep in nested timers (a timer whose callback sets another timer, and so on), the browser clamps the minimum delay to about 4ms. So a self-rescheduling `setTimeout(tick, 0)` does not run as fast as the machine allows; after the fifth nesting it settles into roughly 250 ticks per second, not thousands. This clamp exists specifically to stop tight timer loops from pegging the CPU.

```js
let count = 0;
let last = performance.now();
function tick() {
  const now = performance.now();
  console.log('gap:', (now - last).toFixed(1), 'ms'); // ~0-1ms early, ~4ms after nesting 5
  last = now;
  if (count++ < 10) setTimeout(tick, 0);
}
setTimeout(tick, 0);
```

Third, background throttling. When a tab is hidden (backgrounded, minimized), browsers throttle timers hard, typically to at most once per second, and after a few minutes even less. A poller built on `setTimeout(tick, 0)` that felt "tight" in the foreground collapses to roughly one tick per second the moment the user switches tabs. `setInterval` is throttled the same way.

**Interview nuance:** the right primitive depends on intent. For animation, use `requestAnimationFrame`: it is aligned to the display refresh and is paused entirely (not just slowed) in background tabs, which is what you want for animation. For "run this soon but yield first," use `queueMicrotask` (before paint) or `setTimeout` (after paint), knowing neither is precise. For chunking long work, use `scheduler.yield()`/`scheduler.postTask` with a priority. For a real cadence (a clock, a poll every N seconds), do not trust the timer's own delay to be accurate; compute elapsed time from `Date.now()`/`performance.now()` and correct for drift, or use `setInterval` and accept that ticks can bunch up or be dropped.

**Interview nuance:** background throttling is also a correctness concern, not just performance. Heartbeats, session-keepalive pings, and countdowns that assume `setTimeout` keeps firing on schedule will silently fall behind when the tab is hidden, then fire a burst when it becomes visible again. Design them to reconcile against wall-clock time on visibility change rather than counting ticks.

Recap: `setTimeout` delay is a minimum, nested timers clamp to about 4ms at depth 5, and hidden tabs throttle to about 1 per second. Use `rAF` for animation, `scheduler.yield` for chunking, and wall-clock reconciliation for real cadence; never trust the timer's delay to be exact.

#### See it live

**Demo (js-runnable):** a self-rescheduling `setTimeout(tick, 0)` measures the real gap between ticks and shows it climbing to about 4ms once nesting passes level 5.

```js
const gaps = [];
let count = 0;
let last = performance.now();

function tick() {
  const now = performance.now();
  gaps.push(Number((now - last).toFixed(2)));
  last = now;
  if (count++ < 12) {
    setTimeout(tick, 0); // nested: clamps to ~4ms after depth 5
  } else {
    console.log('per-tick gaps (ms):', gaps.join(', '));
    const late = gaps.slice(6);
    const avg = late.reduce((a, b) => a + b, 0) / late.length;
    console.log('avg gap once nested past level 5:', avg.toFixed(2), 'ms (spec clamp ~4ms)');
  }
}
setTimeout(tick, 0);
```

**Watch:** the first few gaps can be under 1ms, then they settle around 4ms once the nesting level crosses 5, which the histogram shows as a cluster at ~4ms. The background-throttling half of the demo is illustrated, not run in the worker: an on-page counter driven by `setTimeout(tick, 0)` slows to roughly one increment per second when you switch away from the tab, because a headless worker cannot observe document visibility. That approximation is called out so you know the ~4ms clamp is measured live while the 1/sec background throttle is demonstrated in the page.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Explain why a poller that uses `setTimeout(tick, 0)` for a tight cadence drifts to about 4ms in real cadence and why it collapses in a background tab, then pick the right primitive for animation, for post-paint work, and for chunking.

**Think about:**
- Why does the delay clamp after several nestings?
- What happens to timers in an inactive tab?
- What should you use for animation, for post-paint work, for chunking?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The cadence drifts because `setTimeout` delay is a minimum shaped by two spec rules. Nested clamping: the HTML spec requires that once the timer nesting level is 5 or more, the minimum delay is clamped to 4ms. A self-rescheduling `setTimeout(tick, 0)` is nesting timer inside timer, so from the fifth iteration on it cannot run faster than ~4ms apart, capping the poller at about 250 ticks per second regardless of the `0`. Background throttling: when the tab is hidden, browsers throttle timer tasks to at most once per second (and progressively less over time), so the same poller collapses to ~1 tick/sec the instant the user switches tabs.

Fix, by intent:

```js
// Animation: aligned to display refresh, paused (not throttled) when hidden.
function animate() { draw(); requestAnimationFrame(animate); }
requestAnimationFrame(animate);

// Post-paint / "yield then continue": a task, honest about being after paint.
setTimeout(doDeferredWork, 0);

// Chunking long work without freezing: yield to the loop by priority.
await scheduler.yield();
```

Mechanism recap: `rAF` callbacks run right before paint and are suspended entirely in hidden tabs, which is correct for animation (no point drawing frames nobody sees). `scheduler.yield()` returns to the event loop so paint and input can happen, then resumes your work, which is what chunking needs. Neither `rAF` nor `setTimeout` gives a precise cadence.

How to spot it in review: `setTimeout`/`setInterval` used for precise timing, for a "tight" polling cadence, as an animation driver, or as a paint barrier. Any of those is a mismatch.

Production symptom: animations that stutter or tear (because a timer is not refresh-aligned) and pollers/heartbeats that stall in a backgrounded tab and then fire a catch-up burst when it becomes visible. For real cadence, reconcile against `performance.now()`/`Date.now()` on visibility change instead of counting ticks.

Common misconception corrected: `setTimeout(0)` is immediate and its delay is exact. It is neither: the delay is a clamped minimum and hidden tabs throttle it to seconds.

**Self-check rubric:**
- [ ] I explained the nesting clamp (depth 5 -> ~4ms minimum).
- [ ] I explained background-tab throttling to ~1/sec.
- [ ] I chose `rAF` for animation.
- [ ] I chose `scheduler.yield` (or task hop) for chunking and `setTimeout` only for honest post-paint deferral.
- [ ] I named stutter and stalled/bursty pollers as production symptoms.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Countdown drift. A checkout page shows a "reserve expires in 5:00" timer implemented as `let s = 300; setInterval(() => { s--; render(s); }, 1000)`. Users report that when they switch tabs and come back, the countdown is wrong (too high) and sometimes the reservation expires server-side before the client hits 0:00. Explain the mechanism and rewrite it to stay correct.

**Model answer (revealed on demand):**

The countdown counts ticks, but hidden tabs throttle timers, so the number of `setInterval` callbacks that actually fire while the tab is backgrounded is far fewer than one per second. If the user is away for two minutes, the interval might fire only a handful of times instead of 120, so `s` is decremented far too little and the client clock reads "too high." Meanwhile the server measured real wall-clock time and expired the reservation on schedule, so the client shows time remaining that no longer exists.

Mechanism: `setInterval` schedules tasks, and background throttling reduces those tasks to roughly one per second at best, dropping to much less over time. Counting decrements is counting fired tasks, which is not the same as elapsed time. The fix is to stop counting ticks and derive the remaining time from an absolute deadline:

```js
const deadline = Date.now() + 300_000; // absolute expiry, ideally from the server
function render() {
  const remaining = Math.max(0, deadline - Date.now());
  paint(remaining);
  if (remaining === 0) onExpired();
}
setInterval(render, 1000);            // ticks are just "repaint hints", not the source of truth
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) render();     // reconcile immediately on return
});
```

Now each render computes remaining time from the real clock, so it is correct no matter how many intervals fired, and returning to the tab reconciles instantly instead of drifting. Ideally the `deadline` comes from the server so the client and server agree. Spot the anti-pattern in review whenever a timer or interval decrements a counter and treats that counter as elapsed time. Production symptom: countdowns, session timers, and progress estimates that are wrong after tab-switching, and client/server disagreement where the client still shows time left after the server has already expired the resource.

### ajr-l0-scheduling-vs-paint: Choosing the primitive relative to paint (microtask vs rAF vs task vs idle)

- **id:** `ajr-l0-scheduling-vs-paint`  ·  **difficulty:** hard  ·  **est:** 14 min  ·  **demo:** js-runnable  ·  **skills:** scheduling, rAF, layout

#### Learn

Within a single event-loop turn there is a fixed order: run the current task, drain all microtasks, then (if it is time to render) run `requestAnimationFrame` callbacks, then do style, layout, and paint. `requestIdleCallback` runs later still, only if there is spare time before the next frame. Knowing where each callback sits relative to the paint boundary is what lets you measure and mutate the DOM without flicker or thrash.

The classic mistake is measuring layout in a microtask right after a DOM write. Consider toggling a class that changes an element's size and then reading its new height:

```js
el.classList.add('expanded');
queueMicrotask(() => {
  const h = el.getBoundingClientRect().height; // reads pre-paint layout
  console.log('measured height:', h);
});
```

The microtask runs before the browser has done its style/layout/paint for this turn, so you are either reading stale layout or forcing the browser to compute layout synchronously right now (a "forced reflow"). If you interleave reads and writes like this in a loop, each read forces layout to be recomputed against the pending writes, which is **layout thrashing**: O(n) forced reflows that tank performance.

The correct place to read layout that reflects your just-made DOM changes is a `requestAnimationFrame` callback, which runs after microtasks and after style/layout have been resolved for the frame, so `getBoundingClientRect` returns current numbers:

```js
el.classList.add('expanded');
requestAnimationFrame(() => {
  const h = el.getBoundingClientRect().height; // current, post-layout
  el.style.setProperty('--h', h + 'px');
});
```

**Interview nuance:** in React this maps directly to `useLayoutEffect` versus `useEffect`. `useLayoutEffect` runs synchronously after the DOM mutation but before the browser paints, which is exactly where you measure and adjust so the user never sees an intermediate frame (for example, positioning a tooltip against a just-rendered anchor). `useEffect` runs after paint, so measuring there can cause a visible one-frame flash as the element jumps to its corrected position. The tradeoff is that `useLayoutEffect` blocks paint, so keep its work small.

**Interview nuance:** the read/write ordering matters as much as the callback choice. Batch all your reads first, then all your writes ("read then write"), so the browser computes layout once. Libraries like FastDOM formalize this. A single stray `offsetHeight` read between two writes reintroduces a forced reflow.

**Interview nuance:** `requestIdleCallback` is for genuinely deferrable, non-visual work (prefetching, logging, cache warming) and can be starved for a long time on a busy page, so never put user-visible updates in it. And `requestAnimationFrame` is not a general-purpose delay timer; it means "right before the next paint," so using it to "wait a bit" is wrong and couples your logic to the refresh rate.

Recap: per turn it is task, then microtasks, then rAF, then style/layout/paint, with idle callbacks after. Measure layout in rAF (or `useLayoutEffect`), not in a microtask, and batch reads before writes to avoid forced reflow.

#### See it live

**Demo (js-runnable):** schedules the same "read a value then act" work via `queueMicrotask`, `requestAnimationFrame`, `setTimeout`, and `requestIdleCallback`, and logs the order they fire relative to a marked paint boundary. Because a headless worker has no real layout, the DOM read is simulated with an ordering probe.

```js
const events = [];
const mark = (label) => events.push({ label, t: Number(performance.now().toFixed(2)) });

mark('sync start');

queueMicrotask(() => mark('microtask (BEFORE paint, pre-layout)'));
Promise.resolve().then(() => mark('promise microtask (BEFORE paint)'));

// rAF fires just before paint; in the worker we approximate it with a macrotask
// that we label as the paint-adjacent slot.
const raf = (cb) => (typeof requestAnimationFrame === 'function'
  ? requestAnimationFrame(cb)
  : setTimeout(() => cb(performance.now()), 16));
raf(() => mark('rAF (just before PAINT) <-- measure layout here'));

setTimeout(() => mark('setTimeout task (AFTER this turn)'), 0);

const idle = (cb) => (typeof requestIdleCallback === 'function'
  ? requestIdleCallback(cb)
  : setTimeout(cb, 50));
idle(() => mark('requestIdleCallback (spare time only)'));

mark('sync end');

setTimeout(() => {
  console.log('fire order:');
  for (const e of events) console.log(' ', e.t.toFixed(2), 'ms', e.label);
  console.log('Takeaway: both microtasks fire before the rAF/paint slot; measure layout in rAF, not in a microtask.');
}, 80);
```

**Watch:** the log shows `sync start`, `sync end`, then both microtasks, then the rAF (paint-adjacent) slot, then the `setTimeout` task, then idle. The timeline overlay marks the paint boundary right after rAF, so you see the microtask callbacks landing before paint (wrong place to measure) and the rAF callback landing at the paint boundary (right place). A layout-thrash counter spikes for the microtask-measure variant. Note honestly: the worker has no real rendering pipeline, so the rAF-versus-paint boundary and the thrash count are approximated to teach the ordering; in a real page `rAF` truly runs after style/layout resolution.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Explain the layout-thrash difference between reading `getBoundingClientRect` immediately in a microtask versus in `requestAnimationFrame` after toggling an element class, and pick the right callback for "measure after DOM update."

**Think about:**
- In one loop turn, what order do task, microtasks, rAF, and paint run?
- Where does a read that needs current layout belong?
- Why is a microtask a bad place to measure post-layout?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

Within a turn the order is: run the task, drain all microtasks, run `requestAnimationFrame` callbacks, then style, layout, and paint (idle callbacks come after, if there is time). A microtask therefore runs **before** the browser resolves layout for the changes you just made, so reading `getBoundingClientRect` there either returns stale numbers or forces a synchronous reflow to answer your read against pending writes. Do that in a loop and you get layout thrashing: each read forces a fresh layout computation, turning an O(n) operation into O(n) forced reflows.

Fix: measure in `requestAnimationFrame`, which runs after microtasks and after layout is resolved for the frame, so the read is current and cheap:

```js
el.classList.add('expanded');
requestAnimationFrame(() => {
  const rect = el.getBoundingClientRect(); // current, no forced reflow
  tooltip.style.top = rect.bottom + 'px';
});
```

In React the equivalent is `useLayoutEffect` (measure and adjust after DOM mutation, before paint, so no flash) rather than `useEffect` (after paint, risks a one-frame flash). Also batch reads before writes so layout is computed once; a stray read between two writes reintroduces the reflow.

How to spot it in review: `getBoundingClientRect`, `offsetHeight`, `offsetTop`, `scrollHeight`, or `getComputedStyle` reads interleaved with style/DOM writes, especially inside loops, and layout measurement done in `queueMicrotask`, `.then`, or `useEffect` when the intent is "measure the just-updated DOM."

Production symptom: flicker and one-frame flashes (element visibly jumps from wrong to right position), janky measure-then-position UIs (tooltips, popovers, autosizing text areas), and scroll/resize handlers that drop frames because each event forces multiple synchronous layouts.

Common misconception corrected: `requestAnimationFrame` is not a general-purpose delay timer. It means "right before the next paint." Use it because that is where current layout is available, not as a way to "wait a frame or two."

**Self-check rubric:**
- [ ] I stated the per-turn order: task, microtasks, rAF, style/layout/paint.
- [ ] I explained the microtask read is pre-layout and can force a reflow.
- [ ] I chose rAF (or `useLayoutEffect`) to measure after a DOM update.
- [ ] I mentioned batching reads before writes to avoid thrash.
- [ ] I named flicker/jank as the production symptom.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Masonry jank. A gallery lays out cards in a masonry grid by, for each card, writing its column then reading `card.offsetHeight` to decide the next card's position, all inside a single synchronous loop over hundreds of cards. Scrolling and resizing are janky and the CPU spikes on layout. Explain the forced-reflow mechanism and rewrite the layout pass to avoid thrash.

**Model answer (revealed on demand):**

The loop interleaves writes (setting a card's position/column) with reads (`offsetHeight`) on every iteration. Each `offsetHeight` read requires up-to-date layout, but the previous write invalidated layout, so the browser must synchronously recompute layout right then to answer the read. Repeat that hundreds of times and you get hundreds of forced synchronous reflows in one pass, which is why the CPU spikes and scroll/resize (which re-run this pass) are janky.

Mechanism: layout is lazy and batched. The browser normally coalesces writes and computes layout once before paint. A read of a geometry property (`offsetHeight`, `getBoundingClientRect`, etc.) breaks that batching by forcing an immediate layout to return a correct value. Interleaving read/write turns one layout into N layouts.

Fix: separate the phases. Read all the measurements first (one layout), then apply all the writes (one layout before paint), and schedule the pass in `requestAnimationFrame` so it runs against resolved layout:

```js
requestAnimationFrame(() => {
  // 1) READ phase: measure everything up front (single forced layout at most)
  const heights = cards.map((c) => c.offsetHeight);

  // 2) WRITE phase: no reads here, so no forced reflow between writes
  const colTops = new Array(columnCount).fill(0);
  cards.forEach((card, i) => {
    const col = colTops.indexOf(Math.min(...colTops));
    card.style.transform = `translate(${col * colWidth}px, ${colTops[col]}px)`;
    colTops[col] += heights[i];
  });
});
```

Now there is at most one layout for all the reads and one for all the writes, instead of one per card. Spot the anti-pattern in review whenever a geometry read sits inside a loop that also writes styles, or when layout code is not split into distinct read-then-write phases. Production symptom: janky scroll and resize, long "Recalculate Style / Layout" bars in the performance profiler, and dropped frames that scale with the number of items, which is the signature of forced synchronous layout.

### ajr-l0-node-event-loop: Node's Event Loop: Phases, process.nextTick & setImmediate

- **id:** `ajr-l0-node-event-loop`  ·  **difficulty:** hard  ·  **est:** 16 min  ·  **demo:** js-runnable  ·  **skills:** nodejs, event-loop, scheduling

#### Learn

The browser's "one task, then drain microtasks" model is a simplification of what Node does. Node's event loop (libuv) runs in **phases**, in a fixed order each turn: timers (due `setTimeout`/`setInterval`), pending callbacks, poll (I/O), check (`setImmediate`), and close callbacks. Crucially, between every phase Node drains two microtask-like queues, and it drains them in a specific order: the `process.nextTick` queue **first**, then the Promise microtask queue.

That ordering is the headline. `process.nextTick(fn)` runs before every Promise `.then`/`await` continuation and before the loop advances to the next phase. So:

```js
setTimeout(() => console.log('timeout'), 0);
setImmediate(() => console.log('immediate'));
Promise.resolve().then(() => console.log('promise'));
process.nextTick(() => console.log('nextTick'));
console.log('sync');
```

Synchronous `sync` logs first. Then, before the loop does anything else, it drains `nextTick` (`nextTick`), then the Promise queue (`promise`). Then it enters the phases. Here is the famous non-determinism: at the **top level**, whether `timeout` or `immediate` prints first is not guaranteed, because it depends on whether the loop reaches the timers phase before or after the ~1ms timer is considered due, which is timing-dependent. So the deterministic prefix is `sync, nextTick, promise`, followed by `timeout`/`immediate` in an order you cannot rely on.

But move the same code **inside an I/O callback** and the timeout-vs-immediate order becomes deterministic:

```js
const fs = require('fs');
fs.readFile(__filename, () => {
  setTimeout(() => console.log('timeout'), 0);
  setImmediate(() => console.log('immediate'));
});
```

Here `immediate` reliably prints before `timeout`. The `fs.readFile` callback runs in the poll phase; the very next phase is check (where `setImmediate` fires), while the timers phase is a full loop away. So inside any I/O callback, `setImmediate` beats `setTimeout(0)` every time.

**Interview nuance:** `process.nextTick` is misleadingly named. It does not mean "next tick of the loop." It means "before the loop continues," ahead of even Promise microtasks. And `setImmediate` is not "immediate"; it means "in the check phase," after the current poll phase. If you want "run after this I/O turn," the correct primitive is `setImmediate`, not `setTimeout(fn, 0)`.

**Interview nuance:** starvation exists in Node too, and the culprit is `process.nextTick`. A recursive `process.nextTick` (or one that schedules more `nextTick`s on a hot path) keeps the nextTick queue non-empty, so the loop never advances to the poll phase to serve I/O or to the timers phase. The CPU can look idle while the server stops accepting connections. A recursive `setImmediate` does not starve the loop, because it defers to the check phase once per turn, letting the loop cycle through poll (I/O) and timers in between. So the fix for a nextTick-starvation is to move the recursion to `setImmediate`.

Recap: Node runs phased (timers, pending, poll, check, close); between phases it drains `process.nextTick` first, then Promise microtasks. `nextTick` beats every promise callback; inside I/O, `setImmediate` beats `setTimeout(0)`; recursive `nextTick` starves the loop while `setImmediate` does not.

#### See it live

**Demo (js-runnable):** logs synchronous code, a `queueMicrotask`/`Promise.then`, and a `setTimeout(0)`, with inline annotations marking where Node would drain `process.nextTick` (ahead of promise microtasks) and where `setImmediate` would fire (the check phase). The browser worker is not Node, so the `nextTick`/`setImmediate` lanes are shown as annotated output.

```js
// Reproducible in a browser worker: sync -> microtask -> macrotask.
console.log('1: sync');
setTimeout(() => console.log('4: setTimeout task (Node: timers phase)'), 0);
Promise.resolve().then(() => console.log('3: promise microtask'));
queueMicrotask(() => console.log('3b: queueMicrotask (same tier as promise)'));
console.log('2: sync');

// Node-only lanes, ANNOTATED (a browser worker has no process.nextTick / setImmediate):
console.log('--- Node annotation (not executed here) ---');
console.log('In Node the order would be:');
console.log('  1: sync');
console.log('  2: sync');
console.log('  nextTick  <- process.nextTick queue drains BEFORE promise microtasks');
console.log('  3/3b: promise + queueMicrotask microtasks');
console.log('  then phases: timers (setTimeout) vs check (setImmediate)');
console.log('  top-level: setTimeout vs setImmediate order is NOT guaranteed');
console.log('  inside an fs.readFile (poll) callback: setImmediate reliably beats setTimeout(0)');
```

**Watch:** the executed part proves the portable rule live: `1, 2` (sync), then `3, 3b` (microtasks), then `4` (the timer task). The annotated block then shows the Node-specific overlay: a `process.nextTick` lane draining ahead of the Promise microtask lane, and a `setImmediate` marker landing in the check phase. This part is annotation, not execution, because a browser worker has no `process.nextTick` or `setImmediate`; the honest takeaway is that the sync/microtask/macrotask ordering is real and reproducible, while the `nextTick`/`setImmediate` positions are shown as labeled Node behavior you would confirm by running the snippet under `node`.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Predict the exact log order of `setTimeout(()=>log('timeout'),0); setImmediate(()=>log('immediate')); Promise.resolve().then(()=>log('promise')); process.nextTick(()=>log('nextTick')); log('sync')` when it runs inside an `fs.readFile` callback in Node, and name the one pairing whose order is NOT deterministic at the top level.

**Think about:**
- Where does `process.nextTick` run relative to the Promise microtask queue?
- Inside an I/O (poll) callback, why can `setImmediate` reliably beat `setTimeout(0)`?
- Which starves the loop: a recursive `process.nextTick` or a recursive `setImmediate`?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

Inside an `fs.readFile` callback the order is `sync, nextTick, promise, immediate, timeout`.

Mechanism: when this code runs, `sync` logs synchronously. Before the loop advances to any phase, Node drains its between-phase queues in a fixed order: the `process.nextTick` queue first (so `nextTick` logs), then the Promise microtask queue (so `promise` logs). Now the loop continues from the poll phase, where the `fs.readFile` callback lives. The next phase after poll is check, where `setImmediate` fires, so `immediate` logs. The timers phase is a full loop cycle away, so `timeout` logs last. Inside an I/O callback this timeout-vs-immediate order is deterministic precisely because check comes right after poll while timers do not.

```js
const fs = require('fs');
fs.readFile(__filename, () => {
  setTimeout(() => console.log('timeout'), 0);
  setImmediate(() => console.log('immediate'));
  Promise.resolve().then(() => console.log('promise'));
  process.nextTick(() => console.log('nextTick'));
  console.log('sync');
});
// -> sync, nextTick, promise, immediate, timeout
```

The pairing that is NOT deterministic is `setTimeout(0)` versus `setImmediate` at the **top level** (outside I/O). There the order depends on whether the loop reaches the timers phase before the ~1ms timer is deemed due, which is timing-dependent, so either can win.

How to spot it in review: recursive `process.nextTick` (or a `nextTick` that schedules more `nextTick`s) on a hot path, and `setTimeout(fn, 0)` used where the intent is "after this I/O turn" (use `setImmediate`). Fix for starvation: replace the recursive `process.nextTick` with `setImmediate` so the loop can advance to poll and timers and keep serving I/O.

Production symptom: a Node server that stops accepting connections or times out requests while the CPU sits near idle, because the `nextTick` queue never lets the loop continue.

Common misconception corrected: `process.nextTick` does not mean "the next tick of the loop"; it runs before the loop continues, ahead of promise microtasks. And `setImmediate` is not "immediate"; it waits for the check phase.

**Self-check rubric:**
- [ ] I predicted `sync, nextTick, promise, immediate, timeout` inside the I/O callback.
- [ ] I put `nextTick` ahead of the Promise microtask.
- [ ] I explained check-after-poll is why `setImmediate` beats `setTimeout(0)` in I/O.
- [ ] I named top-level `setTimeout(0)` vs `setImmediate` as the non-deterministic pairing.
- [ ] I said recursive `nextTick` starves the loop and `setImmediate` is the fix.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Server goes unresponsive. A Node HTTP service validates large payloads by recursively walking a deep object, and to "avoid blocking" it defers each recursion step with `process.nextTick(() => walk(next))`. Under load, health checks start timing out and the server stops accepting connections, yet CPU usage is low. Diagnose the mechanism and rewrite the deferral so the loop keeps serving I/O.

**Model answer (revealed on demand):**

The recursion through `process.nextTick` starves the event loop. Node drains the entire `nextTick` queue between phases, before advancing. Because each `walk` step schedules another `nextTick`, the queue never empties, so the loop never gets back to the poll phase to accept new connections or run I/O callbacks, and never reaches the timers phase. The CPU is low because the work per step is small; the problem is that the loop is pinned draining `nextTick`s instead of doing I/O. Health checks time out and new sockets are not accepted even though nothing is CPU-bound.

Mechanism: `process.nextTick` has higher precedence than phase progression. A self-scheduling `nextTick` is the Node analog of a self-requeuing browser microtask: it keeps a pre-phase queue non-empty forever. `setImmediate`, by contrast, runs in the check phase once per loop turn, so scheduling the next step with `setImmediate` lets the loop cycle through poll (accept connections, run I/O) and timers between steps.

Fix: defer recursion with `setImmediate` (or, better, chunk synchronously and yield periodically):

```js
function walk(node, cb) {
  // ... process node ...
  const next = getNextChild(node);
  if (next) {
    setImmediate(() => walk(next, cb)); // yields to poll/timers each turn
  } else {
    cb();
  }
}
```

Even better for throughput, process a batch synchronously and only hop to `setImmediate` every N nodes so you are not paying a full loop turn per node. Spot the anti-pattern in review whenever `process.nextTick` is used to "avoid blocking" or to defer recursion, or on any hot path that can schedule more `nextTick`s than the loop can drain. Production symptom: an idle-CPU server that stops accepting connections, request timeouts and failing health checks under load, and a process that looks hung but is actually trapped in the `nextTick` queue.

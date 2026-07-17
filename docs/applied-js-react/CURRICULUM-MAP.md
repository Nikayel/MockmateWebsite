# Applied JavaScript & React: Zero to Hero Curriculum Map

> Part of the **[Applied JS & React curriculum pack](./README.md)**. Connected files: [README](./README.md) · [ARCHITECTURE](./ARCHITECTURE.md) · [CURRICULUM-MAP](./CURRICULUM-MAP.md) · [curriculum-map.json](./curriculum-map.json) · [CONTENT](./CONTENT.md) · [RESEARCH](./RESEARCH.md) · [AGENT-1](./AGENT-1-engineer.md) · [AGENT-2](./AGENT-2-curriculum-developer.md)
> **This file is the authoritative taxonomy** (ids, ordering, `liveDemo`, `thinkAbout`, `modelAnswerOutline`). Full authored prose + demos per module live in [`content/`](./content/), indexed by [`CONTENT.md`](./CONTENT.md).

> Thesis: SYNTAX IS CHEAP (an AI writes it). This course teaches the NUANCES you cannot learn from a typical tutorial: runtime mental models, async correctness, race conditions, N+1 and request waterfalls, re-render and effect gotchas, memory leaks, and the production failure modes that separate someone who can write code from someone who knows what happens at runtime.

> Pedagogy per lesson: **Learn** the nuance -> **See it live** (run the demo, watch the timing / the race firing / the extra re-renders / the leak) -> **Apply** (predict, diagnose, or fix a real snippet as free response, then reveal the model answer).

**Totals:** 12 levels, 58 modules, 163 lessons. Live demos: 52 pure-JS runnable, 111 React demos, 0 without a demo.

## Level summary

| Level | Title | Modules | Lessons | What the learner can catch after it |
| --- | --- | --- | --- | --- |
| L0 | How JavaScript Actually Runs | 3 | 13 | The event loop, run-to-completion, and where async/await actually yields, made visible. |
| L1 | Closures, Scope, References & Identity | 5 | 14 | The silent bug sources: stale captures, shared-reference mutation, this binding, coercion, and the TDZ. |
| L2 | Asynchronous JavaScript Done Right | 5 | 14 | The flagship async lessons: waterfalls, combinators, bounded concurrency, cancellation, and debounce/throttle. |
| L3 | Race Conditions & Correctness Over Time | 4 | 10 | Watch races fire: last-response-wins, double-submit, TOCTOU, dedup, optimistic rollback, and tearing. |
| L4 | Data, Immutability & State Shape | 3 | 12 | Why React misses your change: Object.is bail-out, shallow copies, mutating methods, structural sharing, derived state. |
| L5 | The React Rendering Model | 5 | 14 | Make re-renders visible: triggers, render vs commit, memo defeats, batching, reconciliation, keys, StrictMode. |
| L6 | useEffect & Hooks | 5 | 12 | The deepest nuance area: the dependency contract, cleanup races, when NOT to use an effect, refs, timing, and useEffectEvent. |
| L7 | Data Fetching in React | 6 | 13 | N+1, waterfalls, and races in the wild: cancellation, caching/SWR, optimistic rollback, Suspense, RSC. |
| L8 | Performance & Re-render Optimization | 6 | 16 | Measure before memoizing: diagnose wasted renders, memo economics, composition, context, virtualization, bundle. |
| L9 | Memory Leaks, Lifecycle, Forms & Events | 5 | 13 | The leaks and input traps that only show in real use: orphaned timers/subscriptions, controlled inputs, double-submit, focus. |
| L10 | TypeScript in Real React | 6 | 20 | Type nuances that bite at runtime: discriminated unions, unknown vs any, guards, generics, and where casts hide crashes. |
| L11 | Production-Grade React & Architecture | 5 | 12 | RSC boundaries, hydration, streaming, tearing, state architecture, race-safe mutations, and testing the nuances. |

---

## L0. How JavaScript Actually Runs

_The event loop, run-to-completion, and where async/await actually yields, made visible._

### Module 0.1 - The Runtime Model & Blocking

#### `ajr-l0-run-to-completion` - Run-to-completion and the empty-stack rule

- **Learn:** JS runs each task to completion; the loop only dequeues the next task when the stack is empty, so nothing interrupts a running function.
- **See it live** (js-runnable): runs a handler that logs, schedules a setTimeout and a promise, then keeps computing synchronously for a beat
  - Watch: a live stack-depth meter that stays non-empty through the whole sync block while queued callbacks sit waiting, then drain only after it empties
- **Apply:** Predict the exact log order of a snippet that mixes a sync loop, a setTimeout(0), and a Promise.then, and explain in one sentence why no queued callback can run until the current function returns.
- **Think about:**
  - When exactly does the loop get to pick up the next task?
  - What does "no preemption" mean for a long function?
  - Which of the scheduled callbacks is even eligible to run mid-function?
- **Model answer outline:**
  - Corrected mental model: synchronous code finishes entirely before ANY queued task/microtask runs.
  - Mechanism: the event loop dequeues the next task only when the call stack is empty; there is no preemption.
  - Spot in review: any assumption that a scheduled callback interleaves with surrounding synchronous code.
  - Production symptom: "impossible" ordering bugs and state read before a scheduled write applied.
  - Misconception: setTimeout(fn,0) runs "right away" instead of after the current task.
- _Skills: event-loop, call-stack, scheduling. Difficulty: beginner. ~12 min._

#### `ajr-l0-blocking-main-thread` - Blocking the main thread freezes the UI

- **Learn:** One thread runs JS and drives layout/paint/input; a long synchronous task freezes everything even though the code "works".
- **See it live** (react-demo): runs a button that sets a spinner visible then runs a 1.5s busy while-loop then hides it, with an "await 0 before work" toggle
  - Watch: a CSS spinner that visibly freezes solid during the loop and a DOM label that never repaints to Loading until the loop ends, then works smoothly once yielding is toggled on
- **Apply:** Explain why the spinner never appears in `btn.onclick = () => { showSpinner(); heavyLoop(); hideSpinner(); }` and rewrite it so the spinner actually shows before the work runs.
- **Think about:**
  - A DOM write happened; why did the user never see it?
  - What has to happen before the browser can paint?
  - Does moving the work into another function help? Why not?
- **Model answer outline:**
  - Fix: yield to a macrotask (await a timeout / scheduler.yield) between the DOM write and the heavy work so a paint can happen.
  - Mechanism: the browser can only paint after your synchronous code returns to the loop; a DOM mutation is not a paint.
  - Spot in review: a handler that writes DOM/state then does heavy synchronous computation in the same tick.
  - Production symptom: frozen spinners, unresponsive buttons, janky typing, poor INP.
  - Misconception: calling another function counts as yielding (it does not).
- _Skills: blocking, rendering, INP. Difficulty: beginner. ~14 min._

#### `ajr-l0-dom-write-not-paint` - A state write shows the OLD UI until you yield

- **Learn:** Because of run-to-completion, "set loading then do work" renders the OLD frame, not the intermediate state.
- **See it live** (react-demo): runs a component that sets status to Working, runs a synchronous crunch, then sets status to Done, all in one handler
  - Watch: a status label that jumps straight from Idle to Done and never shows Working, next to a fixed version that yields and shows Working
- **Apply:** Given a handler that setStates "processing" then runs a blocking loop then setStates "done", predict what the user sees and fix it so the processing state is actually visible.
- **Think about:**
  - How many paints happen in this handler?
  - Where would you insert a yield?
  - Would useTransition help here, or is this a different problem?
- **Model answer outline:**
  - Fix: split the work across a yield (await a macrotask) so React can commit and paint the interim state.
  - Mechanism: setState schedules; the commit and paint cannot happen mid-handler because the stack never empties.
  - Spot in review: a loading flag set in the same synchronous block as the blocking work it guards.
  - Production symptom: users never see progress/loading states during heavy local work.
  - Misconception: setState is synchronous and paints immediately.
- _Skills: rendering, blocking, react. Difficulty: beginner. ~12 min._

#### `ajr-l0-concurrency-not-parallelism` - Concurrency is not parallelism (async adds no threads)

- **Learn:** Promise.all interleaves WAITING, it does not run JS in parallel; only Workers give true parallelism.
- **See it live** (js-runnable): runs four CPU-heavy prime-factoring tasks run via Promise.all on the main thread vs across Web Workers
  - Watch: two timing bars: Promise.all still additive and the page frozen, vs 4 Workers overlapping with a "main thread responsive" light staying green
- **Apply:** Explain why wrapping four calls to a synchronous CPU function in Promise.all is no faster than calling them in sequence, then say what actually parallelizes it.
- **Think about:**
  - What does await actually overlap: computation or waiting?
  - Why does the page freeze even with Promise.all?
  - When is async the right tool and when is a Worker?
- **Model answer outline:**
  - Fix: offload CPU-bound work to Web Workers (message passing / transferables) for real parallelism.
  - Mechanism: Promise/async interleave I/O waits on one thread; the single main thread runs one task at a time.
  - Spot in review: Promise.all wrapped around synchronous CPU functions expecting a speedup.
  - Production symptom: "we parallelized it" but the page still hangs and nothing got faster.
  - Misconception: async/await makes CPU work non-blocking.
- _Skills: concurrency, workers, async. Difficulty: intermediate. ~14 min._

### Module 0.2 - Microtasks vs Macrotasks

#### `ajr-l0-two-queues-ordering` - The ordering law: drain all microtasks before the next task

- **Learn:** After each macrotask the loop drains the ENTIRE microtask queue before taking the next macrotask.
- **See it live** (js-runnable): runs a script logging A, setTimeout(B), Promise.then(C), queueMicrotask(D), then E
  - Watch: an animated three-lane visualizer (Call Stack, Microtask Queue, Task Queue) with tokens flowing and the console filling A,E,C,D,B so learners see C and D drain before B
- **Apply:** Predict the exact output order of a snippet mixing sync logs, setTimeout, Promise.then, and queueMicrotask, and explain which queue each callback lands in.
- **Think about:**
  - Which log is guaranteed first and why?
  - Do microtasks queued during the drain also run before the next macrotask?
  - What sources feed each queue?
- **Model answer outline:**
  - Answer: synchronous logs first, then all microtasks (promise callbacks, queueMicrotask), then the timer macrotask.
  - Mechanism: the microtask queue is drained fully (including microtasks queued during draining) between macrotasks.
  - Spot in review: reasoning that assumes setTimeout(0) beats a pending promise callback.
  - Production symptom: state read-after-write races and "why did this log before that".
  - Misconception: setTimeout(fn,0) runs immediately.
- _Skills: event-loop, microtasks, ordering. Difficulty: intermediate. ~14 min._

#### `ajr-l0-promise-vs-settimeout` - All microtasks beat the next timer

- **Learn:** A resolved promise continuation always runs before a 0ms timer scheduled earlier, and a long .then chain still finishes before one setTimeout.
- **See it live** (js-runnable): runs setTimeout(log 1); Promise.resolve().then(log 2).then(log 3); log 4, with a stepper that advances one queue-drain at a time
  - Watch: a predicted-vs-actual console where mismatched guesses flash red and the microtask queue visibly re-fills from chained .then before the timer fires
- **Apply:** Predict the order of `setTimeout(()=>log(1)); Promise.resolve().then(()=>log(2)).then(()=>log(3)); log(4)`, then say why chaining more .then calls never lets the timer sneak in.
- **Think about:**
  - Why does a longer promise chain still finish before setTimeout?
  - Is this ordering something you should rely on for synchronization?
  - What re-enters the microtask queue on each .then?
- **Model answer outline:**
  - Answer: 4, 2, 3, 1; each chained .then re-enters the microtask queue and drains before the macrotask.
  - Mechanism: the loop empties the whole microtask queue before any macrotask.
  - Spot in review: sequencing that uses setTimeout(0) to "wait for" a promise to settle.
  - Production symptom: timing-dependent code that works on one machine and reorders on another.
  - Misconception: setTimeout(0) is a valid way to defer until after a promise settles.
- _Skills: microtasks, promises, ordering. Difficulty: intermediate. ~12 min._

#### `ajr-l0-microtask-starvation` - Microtask starvation freezes the tab with no CPU loop

- **Learn:** A self-re-queuing microtask never lets the queue empty, so rendering and the next macrotask never happen even though no busy loop exists.
- **See it live** (js-runnable): runs recursive Promise.resolve().then(loop) vs recursive setTimeout(loop,0), each next to an on-page animated counter (run in a worker so it can be killed)
  - Watch: a frames-per-second meter that drops to 0 and a frozen counter for the microtask loop, while the setTimeout version keeps ticking
- **Apply:** Given `function loop(){ Promise.resolve().then(loop) } loop()` versus the setTimeout version, predict which one lets an on-page counter keep updating and explain why.
- **Think about:**
  - Why does the promise version freeze the UI without a for-loop?
  - When can the browser paint relative to the microtask queue?
  - How do you make a long chain yield?
- **Model answer outline:**
  - Fix: break recursion with a macrotask (setTimeout / scheduler.yield) so the loop can render.
  - Mechanism: paint and the next macrotask only happen after the microtask queue is empty; a self-requeuing microtask keeps it non-empty forever.
  - Spot in review: recursive scheduling through Promise.resolve().then / .finally / awaited recursion with no macrotask break.
  - Production symptom: a frozen tab that looks like an infinite loop but has no obvious CPU loop.
  - Misconception: only for-loops can freeze the UI.
- _Skills: microtasks, starvation, rendering. Difficulty: advanced. ~14 min._

#### `ajr-l0-settimeout-zero-lies` - setTimeout(0) lies: clamping, nesting, throttling

- **Learn:** delay is a MINIMUM, nested timers clamp to ~4ms, and background tabs throttle to seconds.
- **See it live** (js-runnable): runs a self-rescheduling setTimeout(tick,0) that measures real inter-tick delay, plus a counter you watch while backgrounding the tab
  - Watch: a histogram of actual delays settling around 4ms after the 5th nesting, and a counter that slows to ~1/sec when the tab is hidden
- **Apply:** A poller uses `setTimeout(tick, 0)` for a tight cadence; explain why the real cadence drifts and why it collapses in a background tab, then pick the right primitive.
- **Think about:**
  - Why does the delay clamp after several nestings?
  - What happens to timers in an inactive tab?
  - What should you use for animation, for post-paint work, for chunking?
- **Model answer outline:**
  - Fix: rAF for animation, scheduler.yield for chunking, and never trust setTimeout for precise cadence.
  - Mechanism: the HTML spec clamps nested timers (level >= 5) to 4ms and background tabs throttle to >= 1s.
  - Spot in review: timers used for precise timing, polling cadence, or as a paint barrier.
  - Production symptom: animations that stutter and pollers that stall when the tab is backgrounded.
  - Misconception: setTimeout(0) is immediate and its delay is exact.
- _Skills: timers, throttling, scheduling. Difficulty: intermediate. ~12 min._

#### `ajr-l0-scheduling-vs-paint` - Choosing the primitive relative to paint (microtask vs rAF vs task vs idle)

- **Learn:** Reading layout in a microtask measures pre-paint state and thrashes; rAF is the place for reads/writes that need current layout.
- **See it live** (js-runnable): runs the same DOM read/write scheduled via queueMicrotask, requestAnimationFrame, setTimeout, and requestIdleCallback
  - Watch: a timeline overlay marking the paint boundary so learners see which callbacks land before vs after paint, and a layout-thrash counter spiking for the microtask-measure version
- **Apply:** After toggling an element class, one version reads getBoundingClientRect immediately and another reads it in rAF; explain the layout-thrash difference and pick the right callback for "measure after DOM update".
- **Think about:**
  - In one loop turn, what order do task, microtasks, rAF, and paint run?
  - Where does a read that needs current layout belong?
  - Why is a microtask a bad place to measure post-layout?
- **Model answer outline:**
  - Fix: measure in rAF (or useLayoutEffect in React) so layout is current; use idle callbacks for deferrable work.
  - Mechanism per turn: run task, drain microtasks, maybe rAF callbacks, then style/layout/paint.
  - Spot in review: getBoundingClientRect/offsetHeight reads interleaved with writes (forced synchronous layout).
  - Production symptom: flicker, one-frame flashes, and janky measure-then-position UIs.
  - Misconception: requestAnimationFrame is a general-purpose delay timer.
- _Skills: scheduling, rAF, layout. Difficulty: advanced. ~14 min._

#### `ajr-l0-node-event-loop` - Node's Event Loop: Phases, process.nextTick & setImmediate

- **Learn:** Node runs a phased loop (timers, pending, poll, check, close) where process.nextTick jumps ahead of every promise microtask and setImmediate fires in the check phase after I/O.
- **See it live** (js-runnable): runs a script logging sync code, a queueMicrotask/Promise.then, and a setTimeout(0), with inline annotations marking where Node would drain process.nextTick (before other microtasks) and where setImmediate would fire (the check phase)
  - Watch: the reproducible browser ordering sync then microtask then macrotask, with annotated markers showing the process.nextTick lane draining ahead of the Promise microtasks and setImmediate landing in the check phase (note: the process.nextTick and setImmediate lanes are Node-only and are shown as annotated output because a browser worker is not Node)
- **Apply:** Predict the exact log order of `setTimeout(()=>log('timeout'),0); setImmediate(()=>log('immediate')); Promise.resolve().then(()=>log('promise')); process.nextTick(()=>log('nextTick')); log('sync')` when it runs inside an fs.readFile callback in Node, and name the one pairing whose order is NOT deterministic at the top level.
- **Think about:**
  - Where does process.nextTick run relative to the Promise microtask queue?
  - Inside an I/O (poll) callback, why can setImmediate reliably beat setTimeout(0)?
  - Which starves the loop: a recursive process.nextTick or a recursive setImmediate?
- **Model answer outline:**
  - Answer: sync, nextTick, promise, then timeout/immediate; inside an I/O callback setImmediate (check phase) reliably precedes setTimeout(0), but at the top level the timeout-vs-immediate order is not guaranteed.
  - Mechanism: each loop turn runs a phase in order (timers, pending, poll, check, close); between phases Node drains the process.nextTick queue FIRST and then the Promise microtask queue, so nextTick beats every other microtask.
  - Fix for starvation: replace a recursive process.nextTick with setImmediate so the loop can advance to the poll and timers phases and keep serving I/O.
  - Spot in review: recursive process.nextTick (or a nextTick that schedules more nextTicks) on a hot path, and setTimeout(fn,0) used where you meant "after this I/O turn" (use setImmediate).
  - Production symptom: a Node server that stops accepting connections or times out requests while the CPU sits near idle, because the nextTick queue never lets the loop continue.
  - Misconception: process.nextTick means "the next tick of the loop" (it runs before the loop continues, ahead of promise microtasks) and setImmediate is "immediate" (it waits for the check phase).
- _Skills: nodejs, event-loop, scheduling. Difficulty: advanced. ~16 min._

### Module 0.3 - What async/await Actually Does

#### `ajr-l0-await-desugar-suspension` - await splits the function and yields to the caller

- **Learn:** Everything after await becomes a continuation scheduled as a microtask; control returns to the caller synchronously at the first await.
- **See it live** (js-runnable): runs an async f(){ log a; await g(); log b } and a caller that logs c right after f(), shown beside the hand-desugared .then form with a moving current-line highlight
  - Watch: the highlight jumping OUT to the caller (logging c) at await and resuming at b on the next tick; console shows a, c, b
- **Apply:** Predict the order of a, b, c for `async function f(){ log(a); await g(); log(b) } f(); log(c)` and mark exactly where the function suspended and where control went.
- **Think about:**
  - At the first await, where does control go?
  - When does the code after await run?
  - Is state set after await visible to code that ran right after the call?
- **Model answer outline:**
  - Answer: a, c, b; code after the call runs before code after the await.
  - Mechanism: await posts the rest of the function as a microtask; the caller resumes synchronously at the first await.
  - Spot in review: assuming state set after await is visible synchronously to code that ran right after the call.
  - Production symptom: values read one tick too early, "it is undefined but I just set it".
  - Misconception: await pauses the whole program rather than only the current async function.
- _Skills: async-await, microtasks, control-flow. Difficulty: intermediate. ~14 min._

#### `ajr-l0-await-always-yields` - await always yields, even on a non-promise

- **Learn:** await 5 or await alreadyResolved still defers the continuation to a microtask.
- **See it live** (js-runnable): runs log(1); (async()=>{ await 0; log(3) })(); log(2); with a toggle to add/remove the await
  - Watch: the console order flipping 1,2,3 vs 1,3,2 with a tick-counter badge showing how many microtask turns elapsed
- **Apply:** Predict the order of `log(1); (async()=>{ await 0; log(3) })(); log(2)`, then explain why removing the await changes it.
- **Think about:**
  - Does await on a plain number still defer?
  - How many microtask ticks does await on a native promise cost today?
  - Why can a custom thenable lose an ordering race to a native promise?
- **Model answer outline:**
  - Answer: 1,2,3 with await; 1,3,2 without; await inserts a microtask yield even for a plain value.
  - Mechanism: await wraps its operand via PromiseResolve and schedules the continuation regardless of type.
  - Spot in review: micro-ordering assumptions that break because an await added an invisible tick.
  - Production symptom: subtle one-tick-late reads in ordering-sensitive code.
  - Misconception: await on an already-resolved value is synchronous, or still costs three ticks (modern engines optimized native promises to one).
- _Skills: async-await, microtasks. Difficulty: advanced. ~12 min._

#### `ajr-l0-floating-promise-errors` - Floating promises and error handling across await

- **Learn:** An un-awaited promise that rejects becomes an unhandled rejection your try/catch never sees.
- **See it live** (js-runnable): runs two buttons: fire-and-forget rejecting promise vs awaited rejecting promise, wired to window.onunhandledrejection
  - Watch: the floating one lighting a red "Unhandled rejection" banner while the try/catch stays silent, and the awaited one caught cleanly
- **Apply:** Explain why the catch in `try { doAsync() } catch(e){ handle(e) }` never fires when doAsync is async, and fix it two ways.
- **Think about:**
  - What does try/catch actually catch here?
  - Where does the rejection surface if you do not await?
  - How does await turn a rejection into something catchable?
- **Model answer outline:**
  - Fix: await the call inside the try (or attach .catch); await re-throws the rejection at the continuation point.
  - Mechanism: try/catch only catches synchronous throws and rejections of promises you actually await; a floating promise rejects later on its own.
  - Spot in review: async calls invoked without await or .catch, especially in handlers, effects, and loops.
  - Production symptom: swallowed errors in the browser, and a crashed Node process on unhandledRejection.
  - Misconception: a try/catch around a non-awaited async call catches its rejection.
- _Skills: error-handling, promises, async-await. Difficulty: intermediate. ~12 min._

---

## L1. Closures, Scope, References & Identity

_The silent bug sources: stale captures, shared-reference mutation, this binding, coercion, and the TDZ._

### Module 1.1 - Closures & Capture

#### `ajr-l1-for-loop-var-capture` - The for-loop var capture bug (one shared binding)

- **Learn:** Closures capture the binding, not a snapshot; var is function-scoped so deferred callbacks all read the terminal value.
- **See it live** (js-runnable): runs two loops logging via setTimeout: a var version and a let version, side by side, with a stepper that highlights the single i box mutating
  - Watch: one column printing 3,3,3 (shared binding) next to one printing 0,1,2 (fresh binding per iteration)
- **Apply:** Given `for (var i=0;i<3;i++) setTimeout(()=>log(i))` that logs 3,3,3, make each timer log its own index two ways (let, and an IIFE) and explain why both work.
- **Think about:**
  - Do the timers capture the value of i or the variable i?
  - What makes let special inside a for header?
  - Why does an IIFE with i as an argument fix it?
- **Model answer outline:**
  - Fix: let (per-iteration binding), a per-iteration IIFE, or forEach/map which give a fresh param each call.
  - Mechanism: var is one function-scoped binding already advanced to its terminal value by the time async callbacks run; let rebinds per iteration.
  - Spot in review: any var (or a let hoisted above the loop) inside a loop that registers a callback or pushes a function.
  - Production symptom: onClick handlers built in a loop all act on the last/wrong row.
  - Misconception: closures capture a snapshot of the value at creation time.
- _Skills: closures, scope, var-let. Difficulty: beginner. ~12 min._

#### `ajr-l1-stale-closure-interval` - Stale closure over state in setInterval inside useEffect

- **Learn:** A timer created once captures render-0 state forever, so counters freeze and pollers use the old query.
- **See it live** (react-demo): runs a counter whose interval does setCount(count+1) with [] deps, next to a fixed version
  - Watch: a big number stuck at 1 with a badge showing the value the callback currently sees frozen at 0, while the fixed version ticks 1,2,3
- **Apply:** Given a `useEffect(()=>{ const id=setInterval(()=>setCount(count+1),1000); return ()=>clearInterval(id) },[])` counter that sticks at 1, fix it three ways and say which you would ship.
- **Think about:**
  - Why does the callback keep seeing count as 0?
  - Why does the functional updater escape the stale value?
  - What is the downside of just adding count to the deps?
- **Model answer outline:**
  - Fix: setCount(c=>c+1) (reads latest queued state), a ref mirror, or useEffectEvent.
  - Mechanism: [] runs the effect once; the interval closes over that render count, which never updates.
  - Spot in review: a timer/subscription effect with thin deps whose body reads reactive values it did not list.
  - Production symptom: a counter or live dashboard silently freezes; polling keeps using an expired token.
  - Misconception: adding the value to deps always fixes it (it tears down and resets the timer every change).
- _Skills: closures, useEffect, stale-closure. Difficulty: intermediate. ~14 min._

#### `ajr-l1-stale-closure-listener` - Stale closure in a once-registered listener

- **Learn:** A listener wired in a mount-only effect reads props/state from mount forever.
- **See it live** (react-demo): runs a keydown handler added in useEffect([]) that calls save(draft), while typing updates draft
  - Watch: a "handler sees:" badge frozen on the empty initial draft while the input shows the live value, then tracking live after the fix
- **Apply:** A keydown handler added in `useEffect(..., [])` always saves the empty initial draft; fix it so it saves the current draft without re-registering on every keystroke.
- **Think about:**
  - What value does the listener close over?
  - Why is adding draft to deps a churny fix?
  - What is the non-reactive alternative?
- **Model answer outline:**
  - Fix: useEffectEvent for the handler body, or a ref holding the latest draft, keeping the subscription stable.
  - Mechanism: [] means the listener never re-registers, so it never re-closes over newer values.
  - Spot in review: addEventListener/socket/subscribe in an effect whose body reads reactive values not in deps.
  - Production symptom: a save/submit acts on stale data (old user, old filter, empty draft).
  - Misconception: re-adding the listener on every change is the clean fix (it can drop in-flight events).
- _Skills: closures, events, stale-closure. Difficulty: intermediate. ~12 min._

#### `ajr-l1-closure-retains-large-object` - Closures can retain large objects (real heap growth)

- **Learn:** A live callback that closes over a huge object pins the whole graph so it cannot be GC-ed.
- **See it live** (js-runnable): runs allocate a 10M-element typed array, capture the whole array in a retained listener vs capture only its .length, then report heap size (run in a worker)
  - Watch: two bars: retained-high vs retained-low, proving the closure not the variable name pins the object
- **Apply:** A component loads a 50MB dataset then registers a long-lived click handler that only needs `bigData.length`; explain what stays in memory and fix it.
- **Think about:**
  - What does the closure keep reachable?
  - How does capturing a derived primitive change retention?
  - How would you confirm this in DevTools?
- **Model answer outline:**
  - Fix: capture the minimal derived value (length, id, a slice), or null out large locals before registering long-lived callbacks.
  - Mechanism: a closure keeps its whole lexical environment reachable; one live callback can retain every object in scope.
  - Spot in review: long-lived listeners/timers/memos closing over large props or datasets.
  - Production symptom: heap grows across mount/unmount cycles; detached DOM nodes pinned by handlers.
  - Misconception: unused variables in scope are free once you stop referencing them by name.
- _Skills: closures, memory, gc. Difficulty: advanced. ~14 min._

### Module 1.2 - References, Value & Identity

#### `ajr-l1-reference-vs-value-aliasing` - Reference vs value: aliasing and shared-reference mutation

- **Learn:** Objects/arrays are held by reference; mutating one alias changes every holder.
- **See it live** (js-runnable): runs create an array, alias it, push through the alias, print both
  - Watch: both "copies" growing together in a two-column view because they are the same reference
- **Apply:** Predict what `const b = a; b.push(1)` does to a, then rewrite so b is an independent copy, and name one React state bug this causes.
- **Think about:**
  - Are primitives and objects assigned the same way?
  - What does = actually copy for an object?
  - How does this interact with setState bail-out?
- **Model answer outline:**
  - Fix: copy before mutating ([...a], {...o}) when you need independence.
  - Mechanism: assignment copies the reference for objects, not the contents.
  - Spot in review: a "copy" made by plain assignment then mutated.
  - Production symptom: mutating one thing silently corrupts another (props, undo history, memo snapshots).
  - Misconception: assigning an object to a new variable clones it.
- _Skills: references, mutation, identity. Difficulty: beginner. ~12 min._

#### `ajr-l1-shallow-copy-nested-mutation` - Shallow copy only copies the top level

- **Learn:** Spread and Object.assign copy references one level deep; nested objects stay shared.
- **See it live** (js-runnable): runs a={profile:{address:{city:LA}}}; b={...a}; mutate b.profile.address.city; print both
  - Watch: a two-box reference diagram where the top boxes differ but both point at the same inner object, so a.city also flips
- **Apply:** Explain why `const next={...state}; next.profile.address.city="NYC"` also changes the old state, then rewrite it as a correct nested immutable update.
- **Think about:**
  - What did the spread actually copy?
  - Which levels must you clone to change city?
  - Why does memo on the nested object also miss the change?
- **Model answer outline:**
  - Fix: spread every object on the path root..profile..address so each changed level gets a new reference.
  - Mechanism: spread/assign are shallow; nested objects are aliases, not clones.
  - Spot in review: a single top-level spread followed by a deep x.a.b = ... assignment.
  - Production symptom: "I used the spread operator and it STILL mutated"; undo/redo corrupts.
  - Misconception: {...obj} is a deep copy.
- _Skills: references, immutability, copy. Difficulty: intermediate. ~14 min._

#### `ajr-l1-object-identity-deps` - Object/array/function identity in dependency arrays

- **Learn:** An inline object/array/arrow is a brand-new reference each render, so deps compared with Object.is always differ.
- **See it live** (react-demo): runs useEffect(()=>fetch(options),[options]) where const options={page} is built inline, with an effect-fired counter
  - Watch: the effect counter spinning up on every keystroke until options is wrapped in useMemo, then frozen
- **Apply:** Given `const options={page}; useEffect(()=>fetchData(options),[options])` that fires every render, stabilize it and explain the identity mechanic.
- **Think about:**
  - Why is {page} a new reference each render?
  - What is the worst-case loop this creates?
  - Which fix is best: memo the object or depend on the primitive?
- **Model answer outline:**
  - Fix: depend on primitives, useMemo the object, or hoist a truly-constant literal to module scope.
  - Mechanism: dep arrays compare with Object.is; two structurally-identical literals are different references.
  - Spot in review: object/array/function literals inside a dep array or passed to a memo child.
  - Production symptom: infinite refetch loops and effects firing on every render.
  - Misconception: deps compare object contents.
- _Skills: identity, useEffect, referential-equality. Difficulty: intermediate. ~12 min._

#### `ajr-l1-typeof-null-type-checks` - typeof null and primitive-vs-reference type checks

- **Learn:** typeof null is object and typeof [] is object, so naive guards misclassify null and arrays.
- **See it live** (js-runnable): runs a table of typeof for null, [], {}, function, number, NaN, undefined next to the intended category
  - Watch: cells highlighted red where typeof gives the wrong bucket (null->object, array->object, NaN->number)
- **Apply:** Fix `if (typeof x === "object") x.trim?.()` so it does not treat null as an object or mishandle arrays, and explain why typeof alone is insufficient.
- **Think about:**
  - What does typeof null return and why?
  - How do you correctly test for an array, null, and a plain object?
  - Are primitives compared by value or reference?
- **Model answer outline:**
  - Fix: x === null, Array.isArray(x), typeof x === "function", and a plain-object check for finer types.
  - Mechanism: typeof null is a historical spec bug; arrays and most objects report "object".
  - Spot in review: typeof x === "object" guards that do not first exclude null or handle arrays.
  - Production symptom: crashes on property access when a null slips into an "is object" branch.
  - Misconception: typeof reliably distinguishes objects, arrays, and null.
- _Skills: type-checks, null, guards. Difficulty: beginner. ~12 min._

### Module 1.3 - this Binding

#### `ajr-l1-this-lost-receiver` - Losing this: the detached method

- **Learn:** For regular functions this is set by the call site; extracting a method drops the receiver.
- **See it live** (js-runnable): runs an object with greet(){return this.name}, called as obj.greet() vs const g=obj.greet; g()
  - Watch: a table of call-site to resolved this: the object vs undefined/global, and the resulting crash
- **Apply:** Explain why `const g = obj.greet; g()` throws, then make it robust three ways (arrow field, bind, wrapper arrow).
- **Think about:**
  - What determines this for a regular function?
  - What is this at a bare call in strict mode?
  - When can you NOT use an arrow to fix it?
- **Model answer outline:**
  - Fix: arrow class field, .bind(this), or a wrapper arrow at the call site.
  - Mechanism: this is decided at call time; a bare call in strict mode/modules has this = undefined.
  - Spot in review: a method referenced without its receiver (onClick={this.foo}, promise.then(obj.method)).
  - Production symptom: "cannot read property of undefined" when a handler is passed as a callback.
  - Misconception: arrows are always safer (they cannot be rebound or act as dynamic-this methods).
- _Skills: this, binding, methods. Difficulty: intermediate. ~12 min._

#### `ajr-l1-arrow-vs-function-this` - Arrow vs regular functions for this

- **Learn:** Arrows capture this lexically and ignore the call site; regular functions do not.
- **See it live** (js-runnable): runs log this for object-method call, extracted bare call, arrow method, and bound function
  - Watch: a call-site to this table making the "this is set by the call site, not the definition" rule concrete
- **Apply:** Given a table of four call forms, predict this for each and explain when an arrow method is wrong (needs dynamic this).
- **Think about:**
  - Which forms give the object as this?
  - Why does an arrow object method that reads this.x fail?
  - What does bind return and how does that affect identity?
- **Model answer outline:**
  - Answer: method call -> object; bare call -> undefined; arrow -> lexical enclosing; bind -> the bound object.
  - Mechanism: arrows have no own this; regular functions resolve this per invocation.
  - Spot in review: arrow used as a prototype/object method that needs the instance as this.
  - Production symptom: handlers silently reading globals or undefined instead of the instance.
  - Misconception: arrow functions can be rebound with call/apply/bind (their this is fixed).
- _Skills: this, arrow-functions. Difficulty: intermediate. ~12 min._

### Module 1.4 - Equality & Coercion

#### `ajr-l1-eqeq-vs-eqeqeq` - loose vs strict equality and the == null idiom

- **Learn:** loose equality coerces across types, producing surprising truths; the one sanctioned == is x == null.
- **See it live** (js-runnable): runs a grid comparing 0, "", "0", false, null, undefined, NaN, [] under == and ===
  - Watch: the asymmetry: == lights up many cross-type cells while === stays diagonal, and null == undefined true but null === undefined false
- **Apply:** A guard `if (userInput == false) reject()` wrongly rejects some inputs; predict a set of == results, then rewrite it with === plus an explicit == null check.
- **Think about:**
  - What does == do that === does not?
  - Which single == usage is idiomatic and safe?
  - Why is == non-transitive (0 == "0" but "" != "0")?
- **Model answer outline:**
  - Fix: use === everywhere, and x == null only as the null-or-undefined nullish check.
  - Mechanism: == runs the Abstract Equality algorithm (ToNumber/ToPrimitive); === requires same type and value.
  - Spot in review: any ==/!= that is not the == null idiom, especially against 0/""/false in auth or validation.
  - Production symptom: validation/auth guards accept or reject the wrong inputs.
  - Misconception: null == undefined extends to null == 0/""/false (it does not).
- _Skills: equality, coercion. Difficulty: beginner. ~12 min._

#### `ajr-l1-nan-object-is` - NaN, Object.is, -0 and equality regimes

- **Learn:** NaN !== NaN breaks indexOf/dedup; === and Object.is and SameValueZero disagree on NaN and -0.
- **See it live** (js-runnable): runs a table over (NaN,NaN), (-0,0), (0,-0), (NaN,x) across ===, Object.is, and [].includes
  - Watch: three equality regimes disagreeing: === says NaN != NaN but includes/Object.is say equal; Object.is splits -0 from 0 but === merges them
- **Apply:** Fix `cache.findIndex(x => x === key)` that never finds a NaN key, and separately explain why Object.is(-0,0) is false while -0 === 0 is true.
- **Think about:**
  - Why is NaN the only value not equal to itself?
  - Which detection uses no coercion: isNaN or Number.isNaN?
  - What equality does React use for deps and bail-out?
- **Model answer outline:**
  - Fix: use Number.isNaN / [].includes (SameValueZero) / Object.is for membership instead of ===.
  - Mechanism: === is Strict Equality (NaN != NaN, -0 === +0); Object.is is SameValue; includes/Map/Set use SameValueZero.
  - Spot in review: === NaN (always false) and indexOf(NaN) for membership.
  - Production symptom: dedup/caches silently miss NaN keys; one bad parse poisons a total.
  - Misconception: === handles NaN and -0 sanely.
- _Skills: equality, NaN, Object.is. Difficulty: intermediate. ~12 min._

### Module 1.5 - Hoisting & the TDZ

#### `ajr-l1-hoisting-tdz` - Hoisting and the Temporal Dead Zone

- **Learn:** var hoists as undefined (silent) while let/const throw if touched before their line.
- **See it live** (js-runnable): runs read var above its assignment (undefined), read let above its declaration (ReferenceError shown as a caught card), call a function declaration before its definition (works)
  - Watch: a scope timeline showing the binding created at scope entry but uninitialized (TDZ shaded) until the declaration line
- **Apply:** Predict the output of reading a var vs a let before their declarations, then explain why typeof throws for a TDZ let but is safe for a truly undeclared name.
- **Think about:**
  - What value does a var have before its assignment line?
  - What does the TDZ convert a silent bug into?
  - Are function declarations and const arrow expressions hoisted the same?
- **Model answer outline:**
  - Fix: declare before use; prefer const/let so init-order mistakes surface loudly.
  - Mechanism: all declarations are hoisted, but let/const stay uninitialized until their line (the TDZ); var is initialized to undefined.
  - Spot in review: using a const/let (or a hook value) above its declaration, or relying on var hoisting.
  - Production symptom: undefined-but-should-be-a-value bugs, or ReferenceErrors after a refactor.
  - Misconception: hoisting physically moves code to the top.
- _Skills: hoisting, tdz, var-let. Difficulty: beginner. ~12 min._

#### `ajr-l1-block-vs-function-scope` - Block scope vs function scope (var leaking out of blocks)

- **Learn:** var ignores block braces and is function-scoped, so loop temporaries and guards leak.
- **See it live** (js-runnable): runs if(cond){ var result=compute() } read after the block with var (undefined) vs let (ReferenceError)
  - Watch: nested scope boxes: var punches through the block box up to the function box; let stays inside the inner box
- **Apply:** A function reads a var declared inside an if block and gets undefined when the condition was false; switch to let/const and explain what leaked.
- **Think about:**
  - What is the scope of a var declared in a block?
  - How does this connect to the for-loop capture bug?
  - What should you default to?
- **Model answer outline:**
  - Fix: use const/let for block scoping; default to const, let only when reassigning, never var.
  - Mechanism: var is scoped to the nearest function; let/const to the nearest block.
  - Spot in review: any var, especially loop counters and temporaries expected to be block-local.
  - Production symptom: variables clobber each other or read as undefined outside their intended block.
  - Misconception: var and let are interchangeable.
- _Skills: scope, var-let, blocks. Difficulty: beginner. ~10 min._

---

## L2. Asynchronous JavaScript Done Right

_The flagship async lessons: waterfalls, combinators, bounded concurrency, cancellation, and debounce/throttle._

### Module 2.1 - Waterfalls & Parallelism

#### `ajr-l2-await-in-loop-waterfall` - await-in-a-loop is an accidental waterfall (N+1)

- **Learn:** Awaiting each independent call in a loop turns parallelizable I/O into an additive latency chain.
- **See it live** (js-runnable): runs 20 mock fetches (100ms each) run sequentially via await-in-loop vs Promise.all(ids.map(fetchUser)), with a concurrency slider
  - Watch: two horizontal timing bars, ~2000ms stacked vs ~120ms overlapping, with a live stopwatch and an in-flight counter that hits 20 in parallel
- **Apply:** Rewrite `for (const id of ids) results.push(await fetchUser(id))` to run 20 independent fetches concurrently, and name the one case where you must keep it sequential.
- **Think about:**
  - Why does the next fetch only start after the previous resolves?
  - How does Promise.all overlap the latencies?
  - When is sequential actually required?
- **Model answer outline:**
  - Fix: const results = await Promise.all(ids.map(fetchUser)); keep sequential only when iteration N depends on N-1.
  - Mechanism: await suspends the loop until settle so latencies add; Promise.all starts all promises before awaiting.
  - Spot in review: await inside for/for-of/while over independent items.
  - Production symptom: a list that should load in ~120ms takes ~2s (the #1 real-world async perf bug).
  - Misconception: await in a loop runs the iterations in parallel.
- _Skills: async, promise-all, waterfall. Difficulty: intermediate. ~14 min._

#### `ajr-l2-hidden-serial-awaits` - Hidden serial awaits (two independent calls in a row)

- **Learn:** Two independent `await` lines serialize latency even without a loop.
- **See it live** (js-runnable): runs const a=await fetchA(); const b=await fetchB(); vs const [a,b]=await Promise.all([fetchA(),fetchB()])
  - Watch: two timing bars showing the sum vs the max, with a note that Promise.all preserves input order in the result
- **Apply:** Rewrite `const u = await getUser(); const p = await getPosts()` (independent) so combined latency is the slowest single call, and explain when you could NOT.
- **Think about:**
  - Do these two calls depend on each other?
  - What is the total latency each way?
  - How do you keep result order when parallelizing?
- **Model answer outline:**
  - Fix: const [u,p] = await Promise.all([getUser(), getPosts()]).
  - Mechanism: sequential awaits add latency; Promise.all overlaps and returns results in input order.
  - Spot in review: multiple sequential await lines with no data dependency between them.
  - Production symptom: pages that feel 2-5x slower than the network requires.
  - Misconception: you must serialize to preserve result order.
- _Skills: async, promise-all. Difficulty: intermediate. ~12 min._

#### `ajr-l2-async-in-foreach` - async in forEach/map does not await

- **Learn:** forEach ignores returned promises, so the loop does not wait and rejections float.
- **See it live** (js-runnable): runs items.forEach(async x=>{ await save(x) }); log("done") vs for-of+await vs Promise.all(map)
  - Watch: the forEach version printing done at t=0 while save bars trickle in afterward, then the awaited versions printing done only after all bars fill
- **Apply:** Given `items.forEach(async x => { await save(x) }); log("done")` that logs done too early, fix it for serial and for parallel and say when to use each.
- **Think about:**
  - Why does done log before the saves finish?
  - What happens to a rejection thrown inside the async callback?
  - Which shape gives back-pressure?
- **Model answer outline:**
  - Fix: for-of + await (serial) or await Promise.all(items.map(save)) (parallel); a pool for bounded.
  - Mechanism: forEach discards the callback return value, so there is nothing to await and no back-pressure.
  - Spot in review: async keyword on a forEach/map/filter callback whose promise is never awaited.
  - Production symptom: code after the loop runs too early and errors vanish as floating rejections.
  - Misconception: array.forEach(async ...) awaits each item.
- _Skills: async, iteration, floating-promises. Difficulty: intermediate. ~12 min._

### Module 2.2 - Promise Combinators & Partial Failure

#### `ajr-l2-all-fail-fast` - Promise.all is fail-fast and does not cancel the losers

- **Learn:** One rejection rejects the whole thing and discards every success; the other promises keep running.
- **See it live** (js-runnable): runs fire 5 tasks where #3 rejects at 50ms under Promise.all
  - Watch: the Promise.all bar flipping red at 50ms while the other 4 bars keep filling, proving the losers were not cancelled
- **Apply:** A dashboard loads 5 widgets with `await Promise.all([...])` and one 500 blanks all of them; explain fail-fast and describe what happens to the other in-flight requests.
- **Think about:**
  - What does Promise.all do on the first rejection?
  - Are the successful values kept?
  - Do the sibling promises get cancelled?
- **Model answer outline:**
  - Fix: use Promise.allSettled for partial success, and pair with AbortController if you actually want to stop the losers.
  - Mechanism: Promise.all settles as reject on the first input rejection; results are lost and siblings keep running.
  - Spot in review: Promise.all wrapping independently-failable calls where partial data is acceptable.
  - Production symptom: one flaky call blanks the whole page and leaks the other requests.
  - Misconception: Promise.all cancels the other promises when one rejects.
- _Skills: promises, error-handling, combinators. Difficulty: intermediate. ~12 min._

#### `ajr-l2-allsettled-partial` - allSettled for partial success

- **Learn:** allSettled never rejects and returns a same-length tagged array so you can render per-item outcomes.
- **See it live** (js-runnable): runs 5 tasks with #3 rejecting, rendered as allSettled tiles
  - Watch: 4 green + 1 red tiles at completion, each showing status/value/reason
- **Apply:** Convert the fail-fast dashboard to `Promise.allSettled` and render per-widget success/error tiles from the {status,value,reason} results.
- **Think about:**
  - What is the shape of each result?
  - Does allSettled ever reject?
  - How do you preserve which input each result came from?
- **Model answer outline:**
  - Fix: map over the settled results, branching on status === "fulfilled" vs "rejected".
  - Mechanism: allSettled resolves to an array of tagged results in input order and never rejects.
  - Spot in review: Promise.all used where partial results should still render.
  - Production symptom (fixed): a widget error becomes a local error tile instead of a blank page.
  - Misconception: allSettled can reject.
- _Skills: promises, combinators. Difficulty: intermediate. ~12 min._

#### `ajr-l2-race-any-semantics` - race vs any vs all: choosing for partial failure

- **Learn:** race settles on the first to SETTLE (including reject); any settles on the first to FULFILL.
- **See it live** (js-runnable): runs four combinators over the same 4 tasks (one rejects fast, one resolves fast, two slow)
  - Watch: which one each combinator settles on and with what value/error, and race leaving the loser still running
- **Apply:** Write `fetchWithTimeout(promise, ms)` using Promise.race and a "fastest healthy mirror" using Promise.any, and contrast what each does when the fast one rejects.
- **Think about:**
  - Which combinator ignores rejections until all fail?
  - What error does Promise.any reject with?
  - What do the non-winning promises do afterward?
- **Model answer outline:**
  - Fix: race for timeout (loser must be aborted separately), any for first-success (rejects with AggregateError).
  - Mechanism: race forwards the first settlement; any waits for the first fulfillment; both can leak non-winners.
  - Spot in review: a timeout built on any, or a first-success built on race (a fast rejection wins).
  - Production symptom: a timeout that fires on the wrong event, or a "first success" that a fast error breaks.
  - Misconception: race and any are interchangeable.
- _Skills: promises, combinators, timeout. Difficulty: advanced. ~14 min._

### Module 2.3 - Concurrency Control

#### `ajr-l2-bounded-concurrency-pool` - Bounded concurrency (a promise pool)

- **Learn:** A sliding pool keeps at most N promises in flight, pulling from a queue as each finishes.
- **See it live** (js-runnable): runs mapWithConcurrency(items, limit, fn) over 60 tasks with a concurrency slider (1..20)
  - Watch: a gauge showing active-in-flight capped exactly at the limit, plus wall-clock time and throughput rising then plateauing
- **Apply:** Write `mapWithConcurrency(items, limit, fn)` that keeps at most `limit` promises in flight, then process 1000 ids at concurrency 5.
- **Think about:**
  - Why is naive fixed-batch chunking worse than a sliding pool?
  - What determines the right limit?
  - Where do rate limits and connection caps come in?
- **Model answer outline:**
  - Fix: a queue-draining pool that starts the next task only when a slot frees (or use p-limit).
  - Mechanism: Promise.all is unbounded; a pool bounds fan-out; batching waits on each batch slowest member.
  - Spot in review: Promise.all(bigArray.map(callApi)) with no cap over user-controlled length.
  - Production symptom: 429 rate limits, socket/DB-pool exhaustion, event-loop stalls, OOM.
  - Misconception: more concurrency is always faster.
- _Skills: concurrency, pool, rate-limits. Difficulty: advanced. ~16 min._

#### `ajr-l2-unbounded-fanout` - Unbounded fan-out blows up

- **Learn:** Promise.all over thousands of items opens thousands of connections at once.
- **See it live** (js-runnable): runs await Promise.all(tenThousandIds.map(id=>fetch(url))) vs a pool of 5, instrumented with a connection gauge
  - Watch: the unbounded run spiking the in-flight gauge off the chart and slowing, vs the pool holding a flat capped line
- **Apply:** Explain what breaks when you `await Promise.all(tenThousandIds.map(fetch))`, then bound it.
- **Think about:**
  - What downstream limits does unbounded fan-out hit?
  - What is the browser per-origin connection cap?
  - What is the minimal fix?
- **Model answer outline:**
  - Fix: cap concurrency with a pool / p-limit and add retry with jitter.
  - Mechanism: all promises start synchronously, so N connections open at once.
  - Spot in review: map over an unbounded/user-controlled array straight into Promise.all.
  - Production symptom: rate-limit errors, exhausted sockets, and OOM under load.
  - Misconception: Promise.all self-throttles.
- _Skills: concurrency, rate-limits. Difficulty: intermediate. ~12 min._

### Module 2.4 - Cancellation & Error Handling

#### `ajr-l2-abortcontroller-cancel` - Cancellation with AbortController

- **Learn:** Pass signal to fetch and abort in cleanup/on supersede; distinguish AbortError from real failures.
- **See it live** (react-demo): runs a search box where each keystroke aborts the prior request, with a toggle to disable aborting
  - Watch: each keystroke request bar turning grey "aborted" so only the latest resolves, vs stale results flashing in when aborting is off
- **Apply:** Add an AbortController to a search fetch: pass the signal, abort on the next keystroke, and filter AbortError out of the catch.
- **Think about:**
  - What does abort() do to the fetch promise?
  - Why store the controller in a ref not state?
  - How do debounce and abort differ?
- **Model answer outline:**
  - Fix: fresh controller per request, signal passed to fetch, abort() in cleanup, and if(e.name!=="AbortError") to ignore aborts.
  - Mechanism: abort rejects the fetch with an AbortError and cancels the network work.
  - Spot in review: fetch with no signal in an effect that can re-run, or a catch that toasts every rejection.
  - Production symptom: superseded requests waste bandwidth and their late resolution overwrites fresh UI.
  - Misconception: an ignore flag cancels the request (it only blocks the setState).
- _Skills: cancellation, abort-controller, fetch. Difficulty: intermediate. ~14 min._

#### `ajr-l2-async-error-handling` - try/catch boundaries in async code

- **Learn:** try/catch only catches rejections you actually await in that try; returned or un-awaited promises escape.
- **See it live** (js-runnable): runs three rejecting variants: try{doAsync()}, try{await doAsync()}, try{return doAsync()}, plus Promise.all vs allSettled reasons
  - Watch: CAUGHT/ESCAPED badges per variant, and a panel showing Promise.all exposes one reason while allSettled exposes all
- **Apply:** Label which of `try { doAsync() }`, `try { await doAsync() }`, `try { return doAsync() }` the catch protects, then swap a many-error Promise.all for allSettled.
- **Think about:**
  - What must you do inside the try for the catch to see a rejection?
  - Why does return somePromise lose the local catch?
  - How many reasons does Promise.all surface?
- **Model answer outline:**
  - Fix: await (or return await) inside the try; use allSettled to aggregate every failure.
  - Mechanism: only awaited rejections re-throw at the continuation inside the try; return hands the promise to the caller.
  - Spot in review: an un-awaited async call inside a try block assumed to be protected.
  - Production symptom: errors silently escape logging/handling and surface far away.
  - Misconception: a try/catch around a non-awaited call catches its rejection.
- _Skills: error-handling, async, try-catch. Difficulty: intermediate. ~14 min._

#### `ajr-l2-floating-promise-unhandled` - Floating promises and unhandled rejections

- **Learn:** An un-awaited rejecting promise crashes Node and is silently swallowed in the browser.
- **See it live** (js-runnable): runs a rejecting promise triggered with and without a handler, wired to unhandledrejection
  - Watch: a red "Unhandled rejection" banner for the floating one while the caught one stays clean, plus the console "Uncaught (in promise)"
- **Apply:** Contrast `saveAnalytics()` (fire-and-forget) with `void saveAnalytics().catch(reportError)`, and say what the no-floating-promises lint rule enforces.
- **Think about:**
  - Where does a floating rejection surface?
  - What is the Node default on unhandledRejection?
  - How do you document an intentional fire-and-forget?
- **Model answer outline:**
  - Fix: attach .catch to intentional fire-and-forget; await it otherwise; use void to mark deliberate ignores.
  - Mechanism: not awaiting means the rejection escapes the surrounding try/catch and fires the global handler later.
  - Spot in review: an async call with no await, no return, and no .catch on the same line.
  - Production symptom: swallowed browser errors; a crashed Node process.
  - Misconception: fire-and-forget promises are harmless.
- _Skills: error-handling, floating-promises. Difficulty: intermediate. ~12 min._

#### `ajr-l2-modern-async-primitives` - Modern Async Primitives: AbortSignal.timeout/any, Promise.withResolvers, Array.fromAsync

- **Learn:** Newer built-ins replace hand-rolled patterns: AbortSignal.timeout/any for cancellation, Promise.withResolvers for external resolve, and Array.fromAsync to collect async iterables.
- **See it live** (js-runnable): runs a fetch guarded by AbortSignal.timeout(ms) that aborts when the timeout fires, then a second run using AbortSignal.any([userSignal, AbortSignal.timeout(ms)]) racing a user-cancel against a timeout
  - Watch: the request bar flipping to "aborted" the moment the timeout fires, and a label naming which signal won (user vs timeout) when the two are combined with AbortSignal.any
- **Apply:** Replace `const c = new AbortController(); const t = setTimeout(() => c.abort(), 5000); fetch(url, { signal: c.signal }).finally(() => clearTimeout(t))` with AbortSignal.timeout(5000), then combine it with a user-cancel signal using AbortSignal.any so either source aborts the fetch.
- **Think about:**
  - What wiring does AbortSignal.timeout(ms) free you from doing by hand?
  - When an AbortSignal.any signal aborts, how do you tell which source signal won?
  - Why did people reach for the deferred pattern before Promise.withResolvers?
  - What does Array.fromAsync do that a for-await loop plus push does not?
- **Model answer outline:**
  - Fix: fetch(url, { signal: AbortSignal.timeout(5000) }); to add user-cancel use AbortSignal.any([userSignal, AbortSignal.timeout(5000)]) so the first source to fire aborts the request.
  - Mechanism: AbortSignal.timeout returns a signal that auto-aborts after ms with a TimeoutError reason; AbortSignal.any returns a composite signal that aborts when ANY input aborts and forwards that input's reason, so signal.reason.name tells you which one won.
  - Promise.withResolvers() returns { promise, resolve, reject } in one call, replacing the `let resolve; const p = new Promise(r => { resolve = r })` deferred dance for event-driven resolution.
  - Array.fromAsync(asyncIterable) drains an async iterator (awaiting each value) into an array, unlike Array.from which does not await promises or consume async iterables.
  - Spot in review: a manual setTimeout+abort with a clearTimeout in finally, a hand-rolled deferred with an externally assigned resolve, or a for-await loop that only pushes values into an array.
  - Production symptom (before these): leaked timers when the fetch settles first, aborts that cannot distinguish timeout from user-cancel, and resolve/reject references leaking out of the Promise executor.
  - Misconception: AbortSignal.timeout leaves a timer you must clear (it is managed and GC-friendly), and AbortSignal.any is the same as Promise.race (race settles a promise value; any produces a composite abort signal).
- _Skills: cancellation, abort-signal, async. Difficulty: intermediate. ~14 min._

### Module 2.5 - Debounce & Throttle

#### `ajr-l2-debounce-basics-stale` - Debounce and its identity/stale-closure bugs

- **Learn:** Defining debounce inline recreates the timer every render so nothing debounces, and it captures stale state.
- **See it live** (react-demo): runs an inline-debounce input vs a stable useMemo/useRef debounce, with a render-count badge and a fires counter
  - Watch: the inline version firing on every keystroke (new timer each render) while the stable version fires once 300ms after typing stops
- **Apply:** Given `const debounced = debounce(handle, 300)` in the component body, fix it with a stable instance plus a cleanup that cancels, and explain the identity churn.
- **Think about:**
  - Why does a new function identity each render reset the timer?
  - How do you read the latest value inside the debounced callback?
  - What must cleanup do on unmount?
- **Model answer outline:**
  - Fix: create a stable debounced instance via useMemo/useRef, read latest via ref, cancel in cleanup.
  - Mechanism: a fresh function each render owns a fresh internal timer, so nothing is ever debounced.
  - Spot in review: debounce/throttle defined inline in a component body.
  - Production symptom: "debounced" search still fires per keystroke, or fires with an old query.
  - Misconception: the React Compiler fixes debounce identity (it does not).
- _Skills: debounce, identity, react. Difficulty: intermediate. ~14 min._

#### `ajr-l2-throttle-leading-trailing` - Throttle leading vs trailing (the dropped final call)

- **Learn:** Leading-only throttle drops the last event, so the final scroll/resize value never applies.
- **See it live** (react-demo): runs a rapid simulated scroll stream marking which events fire under leading-only vs leading+trailing
  - Watch: the tracked position dot landing on the wrong spot without trailing and snapping correct with it
- **Apply:** Implement `throttle(fn, ms, { leading, trailing })` and show a scroll handler that never applies the final position when trailing is off; enable trailing to flush it.
- **Think about:**
  - What does leading-only guarantee about the last event?
  - How is throttle different from debounce?
  - When does the final value matter?
- **Model answer outline:**
  - Fix: enable the trailing edge so the last event in a burst is flushed; cancel/flush on unmount.
  - Mechanism: throttle limits rate (fire at most every N ms); debounce waits for quiet.
  - Spot in review: a scroll/resize handler throttled without trailing where the last position matters.
  - Production symptom: UI ends mis-positioned after a fast scroll/resize.
  - Misconception: throttle and debounce are the same tool.
- _Skills: throttle, events. Difficulty: intermediate. ~12 min._

---

## L3. Race Conditions & Correctness Over Time

_Watch races fire: last-response-wins, double-submit, TOCTOU, dedup, optimistic rollback, and tearing._

### Module 3.1 - Last-Response-Wins

#### `ajr-l3-last-response-wins` - Last-response-wins renders the wrong data

- **Learn:** A slower earlier request resolves after a newer one and overwrites correct UI with stale data.
- **See it live** (react-demo): runs a dropdown switching userId 1->2->3 fast where id 1 is 2000ms and id 3 is 200ms, buggy vs ignore-flag fixed
  - Watch: the buggy card flickering to user 3 then wrong-flipping back to user 1, with a strikethrough badge on discarded responses in the fixed version
- **Apply:** Given `useEffect(()=>{ fetchUser(id).then(setUser) }, [id])`, make the UI always show the last requested id even when an earlier request resolves later.
- **Think about:**
  - Is network order the same as request order?
  - What does the effect cleanup run before?
  - Does the ignore flag stop the request or just the render?
- **Model answer outline:**
  - Fix: let ignore=false; ...then(u=>{ if(!ignore) setUser(u) }); return ()=>{ ignore=true }.
  - Mechanism: overlapping promises resolve in completion order; the last setState wins regardless of correctness; cleanup neuters superseded effects.
  - Spot in review: any .then(setState) in an effect with a changing dep and no cleanup or abort.
  - Production symptom: a typeahead/profile briefly shows the wrong record, hard to reproduce.
  - Misconception: a loading spinner fixes ordering (it hides pending, not the overwrite).
- _Skills: races, useEffect, fetch. Difficulty: advanced. ~16 min._

#### `ajr-l3-abort-vs-ignore-flag` - AbortController vs the ignore flag

- **Learn:** The ignore flag stops the bad setState but the request keeps running; abort also cancels it.
- **See it live** (react-demo): runs a simulated Network panel with in-flight bars, comparing ignore-flag (all bars complete, greyed) vs AbortController (bars snap to red aborted)
  - Watch: ignore-flag showing 5 bars running to completion while AbortController snaps 4 to aborted and only the last completes
- **Apply:** Start from the ignore-flag version and also cancel the superseded request on the wire, handling AbortError so it does not surface as a real error.
- **Think about:**
  - What does the ignore flag NOT do?
  - Where do you call abort()?
  - How do you keep AbortError out of the error UI?
- **Model answer outline:**
  - Fix: new AbortController per run, pass signal, abort() in cleanup, and ignore AbortError in the catch.
  - Mechanism: abort rejects the fetch with a DOMException named AbortError and issues a real TCP cancel.
  - Spot in review: fetch with no signal in a re-running effect, or a catch treating every rejection as an error.
  - Production symptom: wasted bandwidth/quota and rate-limit trips from abandoned requests.
  - Misconception: the ignore flag saves the network work.
- _Skills: cancellation, abort-controller, races. Difficulty: intermediate. ~12 min._

#### `ajr-l3-stale-closure-fetch` - Stale-closure fetch uses the wrong input

- **Learn:** An async callback reads a variable captured when the closure was created, so after an await it acts on old props.
- **See it live** (react-demo): runs an input bound to query; a button runs a 1500ms async op then alerts the value it saw, buggy vs fixed
  - Watch: the buggy alert saying abc (captured) while the input shows xyz, and a render badge showing the captured vs live value diverging
- **Apply:** A `handleSave` does `await api.load(); save(query)` with a useCallback missing query in deps; make save always use the current query.
- **Think about:**
  - Which render did this closure capture?
  - Why is this different from last-response-wins?
  - Which fix is non-reactive?
- **Model answer outline:**
  - Fix: correct the deps, use a ref for latest, or useEffectEvent for the non-reactive read.
  - Mechanism: every render creates fresh closures binding that render props; a wrong dep array freezes an old one.
  - Spot in review: useCallback/useEffect/useMemo whose deps omit a referenced variable around an await.
  - Production symptom: a save/submit runs with a previous filter/user/page.
  - Misconception: the React Compiler fixes stale closures (it memoizes; wrong deps are still a correctness bug).
- _Skills: closures, races, useEffectEvent. Difficulty: advanced. ~14 min._

### Module 3.2 - Double-Submit & Idempotency

#### `ajr-l3-double-submit-guard` - Double-submit and the un-disabled button

- **Learn:** A double-click on Pay fires N requests because setState-based disabling has not committed yet.
- **See it live** (react-demo): runs a Pay button with a 1200ms server, rapid-clicked 5x, buggy vs isPending-disabled vs ref-lock
  - Watch: a Charges counter climbing to 5 in the buggy version and staying at 1 once guarded, with extra clicks flashing "ignored"
- **Apply:** Guarantee at most one charge per intent even on rapid double-click, using both a pending guard and (conceptually) an idempotency key.
- **Think about:**
  - Why does a second synchronous click still see the button enabled?
  - What does a ref lock close that a state flag cannot?
  - Why is the client guard alone insufficient?
- **Model answer outline:**
  - Fix: disable via isPending AND a synchronous ref/lock, plus a server idempotency key.
  - Mechanism: setState is async, so a second click in the same tick reads the old enabled state.
  - Spot in review: a mutating POST with a button not disabled on pending and no idempotency.
  - Production symptom: duplicate orders, double charges, two emails.
  - Misconception: a disabled-on-pending state flag alone prevents double submit.
- _Skills: races, idempotency, forms. Difficulty: intermediate. ~14 min._

#### `ajr-l3-idempotency-key` - Idempotency keys make retries safe

- **Learn:** A stable client-generated key lets the server treat a retried request as a no-op.
- **See it live** (react-demo): runs a variant that keeps the button enabled but sends one idempotency key, with client-attempts and server-applied counters
  - Watch: client attempts climbing while the server-applied charges counter stays at 1 because of server dedup
- **Apply:** Explain why a client disabled button is not enough (retries, refresh, multi-tab) and add a stable idempotency key generated once per intent.
- **Think about:**
  - What bypasses a client-only guard?
  - When must the key be generated?
  - Where does dedup actually happen?
- **Model answer outline:**
  - Fix: generate the key once when the intent forms (not per retry) and dedup server-side.
  - Mechanism: server-side idempotency (unique key/upsert) is the authoritative guarantee.
  - Spot in review: a mutating action with no idempotency key relying on the UI to gate it.
  - Production symptom: duplicate writes from retries/refresh/pre-hydration submits.
  - Misconception: regenerating the key per retry is fine (it defeats the purpose).
- _Skills: idempotency, races, server. Difficulty: advanced. ~14 min._

### Module 3.3 - Check-Then-Act & Dedup

#### `ajr-l3-check-then-act-toctou` - Check-then-act (TOCTOU) races across an await

- **Learn:** You read state, await, then act assuming it is unchanged, but other callers ran during the gap.
- **See it live** (js-runnable): runs fire 4 concurrent getOnce(id) with the real fetch instrumented by a call counter: naive check-then-act vs promise-lock
  - Watch: the naive version showing counter=4 (all passed the if) vs the promise-lock version showing counter=1 with the other 3 awaiting the same promise
- **Apply:** Given `if (!cache[id]) { cache[id] = await fetch(id) }` called concurrently, prevent two callers from both passing the check, by caching the in-flight PROMISE.
- **Think about:**
  - Why does the boolean go stale during the await?
  - How does caching the promise make check-and-act atomic?
  - Why is a promise a better lock than a boolean?
- **Model answer outline:**
  - Fix: if(!inflight[id]) inflight[id]=fetch(id); return inflight[id] (store the promise synchronously before any await).
  - Mechanism: await yields the loop; other callers run during the gap, so the boolean you checked is already stale.
  - Spot in review: if(!x){ await ...; x=... } where x is shared and the function can re-enter before it settles.
  - Production symptom: duplicate fetches/inits, double-charged operations under concurrency.
  - Misconception: single-threaded JS has no races.
- _Skills: races, toctou, dedup. Difficulty: advanced. ~16 min._

#### `ajr-l3-inflight-dedup-coalescing` - In-flight request dedup (single-flight)

- **Learn:** Many components asking for the same key should produce one request and share the result.
- **See it live** (react-demo): runs mount 5 UserCard id=1 at once with a network counter, naive vs coalesced
  - Watch: the naive version firing 5 requests (counter=5) vs the coalesced version firing 1 with all 5 cards filling from the shared promise
- **Apply:** Make N components asking for the same key produce exactly one network request and share the result, via a keyed promise cache.
- **Think about:**
  - How does dedup differ from caching and from batching?
  - What is the dedup window?
  - How does TanStack Query productionize this?
- **Model answer outline:**
  - Fix: key the request, store the pending promise in a map, return the existing promise within the window, then evict.
  - Mechanism: one settle resolves all subscribers; the promise cache collapses identical concurrent calls.
  - Spot in review: a useEffect(fetch) in a leaf used many times per page with no shared cache.
  - Production symptom: N identical requests, N spinners, and inconsistent snapshots.
  - Misconception: a shared cache dedups distinct keys (only identical keys; N distinct still fire N).
- _Skills: dedup, coalescing, caching. Difficulty: advanced. ~14 min._

#### `ajr-l3-debounced-search-ordering` - Debounced search with cancellation and ordering

- **Learn:** Debounce reduces calls but does not fix ordering; you also need abort or tag-matching.
- **See it live** (react-demo): runs type react char by char with randomized latency, buggy (debounce only) vs fixed (debounce+abort+tag-match)
  - Watch: the buggy list thrashing and settling on results for "rea" while the fixed list only ever shows results matching the current input
- **Apply:** Debounce the input, cancel superseded requests, and never render results for an older query, combining all three.
- **Think about:**
  - Does debounce fix out-of-order arrivals?
  - What does tag-matching compare?
  - How do useTransition/useDeferredValue relate (or not) to this?
- **Model answer outline:**
  - Fix: debounce + AbortController + a per-query guard (compare the response query to the current one before committing).
  - Mechanism: debounce limits count; a slow in-flight request from before the pause still races.
  - Spot in review: fetch directly in onChange with no debounce and no abort.
  - Production symptom: search flickers to wrong results and sometimes sticks on stale ones.
  - Misconception: useTransition/useDeferredValue dedupe or order network requests (they are rendering concerns).
- _Skills: races, debounce, cancellation. Difficulty: advanced. ~16 min._

### Module 3.4 - Optimistic Updates & Tearing

#### `ajr-l3-optimistic-rollback` - Optimistic updates and rollback on failure

- **Learn:** Instant UI needs a snapshot and rollback, and the last server-confirmed value must win.
- **See it live** (react-demo): runs a like/unlike toggled fast with a server that fails ~40%, naive vs useOptimistic
  - Watch: the naive count drifting and showing liked after a failure, vs useOptimistic snapping instantly then reconciling/rolling back so the count always matches the server
- **Apply:** A like button does `setLiked(true); await api.like()` with no rollback; show the like instantly but revert on failure and keep counts correct under rapid toggles.
- **Think about:**
  - What is the optimistic value derived from?
  - What must win under rapid toggles: last paint or last server confirm?
  - When is the optimistic overlay discarded?
- **Model answer outline:**
  - Fix: useOptimistic (auto-reverts on settle) and reconcile base state from the server response.
  - Mechanism: optimistic state is a temporary overlay on base state; on settle it is replaced by server truth.
  - Spot in review: optimistic setState with no error branch or no rollback.
  - Production symptom: a failed mutation leaves a phantom like/count on screen.
  - Misconception: optimistic update is just setState before the call.
- _Skills: optimistic, races, useOptimistic. Difficulty: advanced. ~14 min._

#### `ajr-l3-concurrent-tearing-sync-store` - Concurrent tearing and useSyncExternalStore

- **Learn:** Under concurrent rendering a render can be interrupted; an external store mutating mid-render tears the UI.
- **See it live** (react-demo): runs an external counter store mutated during a startTransition render, read by several components, naive subscription vs useSyncExternalStore
  - Watch: components showing mismatched values (41 and 42) with the naive subscription, then all showing the same value with useSyncExternalStore
- **Apply:** A component reads a hand-rolled external store via useState+subscribe inside a transition and tears; switch it to useSyncExternalStore.
- **Think about:**
  - What does concurrent React do to a render that lets tearing happen?
  - Why are useState/useContext tear-safe but raw subscriptions not?
  - What does getSnapshot guarantee?
- **Model answer outline:**
  - Fix: subscribe with useSyncExternalStore (getSnapshot + getServerSnapshot) for a consistent synchronous read.
  - Mechanism: concurrent React can pause/resume/restart a render; a changing external source is read inconsistently.
  - Spot in review: subscribing to an external store with useEffect+useState instead of useSyncExternalStore.
  - Production symptom: two parts of the tree show different values of the same data.
  - Misconception: side effects in render are fine because the render always commits.
- _Skills: tearing, useSyncExternalStore, concurrent. Difficulty: advanced. ~16 min._

---

## L4. Data, Immutability & State Shape

_Why React misses your change: Object.is bail-out, shallow copies, mutating methods, structural sharing, derived state._

### Module 4.1 - Mutation React Misses

#### `ajr-l4-mutation-object-is-bailout` - Mutation is invisible to React (the Object.is bail-out)

- **Learn:** push/splice/assign changes the data but not the reference, so React skips the re-render.
- **See it live** (react-demo): runs two todo lists: Add (mutate) via push+setState(sameRef) vs Add (copy) via setState([...arr,x]), with a render-count badge and a raw-length overlay
  - Watch: the mutate list badge frozen and the list never growing even as a debug length overlay ticks up, vs the copy list growing
- **Apply:** Fix `const add = t => { todos.push(t); setTodos(todos) }` so a new todo appears, and explain why pushing then setting the same array is a no-op to React.
- **Think about:**
  - What does React compare prev and next state with?
  - Did the data actually change?
  - Why does the length overlay move while the UI does not?
- **Model answer outline:**
  - Fix: setTodos([...todos, t]) to produce a new top-level reference.
  - Mechanism: React bails out when Object.is(prev,next) is true; mutating in place keeps the same reference.
  - Spot in review: .push/.splice/.sort or obj.prop= on state followed by setState with the same variable.
  - Production symptom: the UI silently shows stale data; the bug is intermittent (StrictMode/parent renders sometimes flush it).
  - Misconception: the React Compiler rescues in-place mutation (it memoizes on identity, so it makes it worse).
- _Skills: immutability, react, object-is. Difficulty: intermediate. ~14 min._

#### `ajr-l4-props-mutation` - Mutating props corrupts the parent and breaks memo

- **Learn:** Props are read-only; mutating them reaches up and leaves memoized children inconsistent.
- **See it live** (react-demo): runs a memoized child that does props.items.push(newItem) to add locally, with render badges on parent and a memoized sibling
  - Watch: the parent list and the memoized sibling diverging (one updated by mutation, one frozen by memo)
- **Apply:** A child does `props.items.push(newItem)` to add locally; show the parent silently changing and the sibling going stale, then lift the change to a callback prop.
- **Think about:**
  - Why does mutating props reach the parent?
  - Why does the memoized sibling not update?
  - What is the correct data flow?
- **Model answer outline:**
  - Fix: child requests the change via a callback; the parent owns state and replaces it immutably.
  - Mechanism: props are the parent objects by reference; JS does not enforce read-only.
  - Spot in review: any mutator whose target traces back to props.
  - Production symptom: visibly inconsistent UI (mutated data plus stale memoized siblings).
  - Misconception: mutating props is fine because it "works" locally.
- _Skills: immutability, props, memo. Difficulty: intermediate. ~12 min._

#### `ajr-l4-set-same-reference-noop` - setState with the same reference is a no-op

- **Learn:** Even the functional updater is ignored if you mutate the draft and return the same object.
- **See it live** (react-demo): runs an input through a mutate-in-updater setter vs a spread-in-updater setter
  - Watch: the mutate field never changing (and the render badge never ticking) while the spread field updates live
- **Apply:** Explain why `setUser(u => { u.name = name; return u })` never updates the screen, then rewrite the updater to return a new object.
- **Think about:**
  - Does the functional updater skip the Object.is check?
  - Is the same true for useReducer?
  - Does a new object with identical field values re-render?
- **Model answer outline:**
  - Fix: setUser(u => ({ ...u, name })) so the updater returns a new reference.
  - Mechanism: React compares Object.is(prev, next) even for updater returns; a mutated same ref bails out.
  - Spot in review: an updater whose body assigns to prev.x and returns prev.
  - Production symptom: form fields that will not update despite calling setState.
  - Misconception: the functional updater form bypasses the identity check.
- _Skills: immutability, react, reducers. Difficulty: intermediate. ~12 min._

#### `ajr-l4-map-set-fresh-container` - Map and Set state need a fresh container

- **Learn:** map.set/set.add mutate in place and return the same reference, so React never re-renders.
- **See it live** (react-demo): runs toggle chips stored in a Set: mutate mode (set.add + setState) vs copy mode (new Set(prev))
  - Watch: mutate mode never highlighting a chip (with a debug size probe still updating) vs copy mode highlighting instantly
- **Apply:** Given selection stored in a Set where `selected.add(id); setSelected(selected)` never highlights, fix it using new Set(selected).
- **Think about:**
  - What do Map/Set mutators return?
  - What are the copy idioms for Map and Set?
  - What is the perf tradeoff for large collections?
- **Model answer outline:**
  - Fix: setSelected(new Set(prev).add(id)) (or new Map(prev)).
  - Mechanism: Map/Set methods mutate and return the collection or a boolean, never a new reference.
  - Spot in review: .set/.add/.delete on a state value followed by setState of the same variable.
  - Production symptom: selections/toggles that do not visually update.
  - Misconception: Maps and Sets spread like arrays/objects.
- _Skills: immutability, map-set, react. Difficulty: intermediate. ~12 min._

### Module 4.2 - Copy Semantics

#### `ajr-l4-shallow-vs-deep-copy` - Shallow copy hides nested mutation

- **Learn:** A single-level spread still shares nested references, so mutating a child corrupts the original.
- **See it live** (js-runnable): runs spread a nested object, mutate copy.a.b, print original and copy
  - Watch: a two-box reference diagram: top boxes differ but both point at the same inner object, so both show the change
- **Apply:** Given `const next={...state}; next.profile.name="X"; setState(next)` that also changes the old state, do a correct nested update and explain what the spread copied.
- **Think about:**
  - What did the spread copy and not copy?
  - Which levels must you clone?
  - Why does memo on the nested object miss the change?
- **Model answer outline:**
  - Fix: { ...state, profile: { ...state.profile, name: "X" } } (clone every level on the path).
  - Mechanism: spread/assign are shallow; nested objects are shared references.
  - Spot in review: a top-level spread followed by a deep x.a.b = ... assignment.
  - Production symptom: undo/redo and memo snapshots corrupt because they share the mutated subtree.
  - Misconception: spread makes an immutable deep copy.
- _Skills: immutability, copy, nesting. Difficulty: intermediate. ~12 min._

#### `ajr-l4-mutating-methods-sort` - Mutating vs non-mutating array methods (the sort trap)

- **Learn:** sort/reverse/splice mutate in place and return the same array; map/filter/slice do not.
- **See it live** (js-runnable): runs a grid running each common Array method on a fresh [3,1,2], showing return value and whether the original mutated
  - Watch: sort/reverse/splice glowing red (mutates) while map/filter/slice/toSorted stay green, plus the default sort lexicographic bug on [1,10,2]
- **Apply:** A component renders `const sorted = items.sort(...)`; show it mutates the source (breaking other consumers) and fix it with a non-mutating alternative.
- **Think about:**
  - Which methods mutate and which return copies?
  - Why is setState(arr.sort()) a double bug?
  - What does default sort compare?
- **Model answer outline:**
  - Fix: copy first ([...arr].sort()) or use React 19 arr.toSorted().
  - Mechanism: sort returns the same reference it mutated, so it is both an in-place mutation and a same-ref no-op.
  - Spot in review: sort/reverse/splice applied directly to props, state, or memo inputs.
  - Production symptom: a "sort the list" feature corrupts the underlying data and skips re-render.
  - Misconception: sort/reverse/splice return copies like map/slice.
- _Skills: immutability, arrays, sort. Difficulty: intermediate. ~12 min._

#### `ajr-l4-structuredclone-blindspots` - structuredClone: real deep clone and its blind spots

- **Learn:** structuredClone deep-clones many types but drops functions/Symbols and throws on class instances/DOM nodes.
- **See it live** (js-runnable): runs feed one rich object (Date, Map, fn, Symbol, undefined, class instance) through spread, JSON.parse(JSON.stringify), and structuredClone
  - Watch: a matrix of what each preserved/lost/threw: JSON turns Date into a string and drops fn/undefined; structuredClone throws on the class instance
- **Apply:** For a state object with a Date, a Map, a method, and a class instance, predict which survive spread vs JSON vs structuredClone, and choose the right tool.
- **Think about:**
  - What does structuredClone handle that JSON cannot?
  - What does JSON.parse(JSON.stringify) silently break?
  - Does React actually want a deep clone?
- **Model answer outline:**
  - Fix: prefer structural sharing over deep clone; use structuredClone only for plain-ish data and know its throws.
  - Mechanism: the structured clone algorithm handles Date/Map/Set/typed arrays/cycles but not functions/class prototypes/DOM.
  - Spot in review: JSON round-trip "deep clone" of state holding Dates/undefined/functions.
  - Production symptom: dates become strings, undefined/functions vanish, or a DataCloneError at runtime.
  - Misconception: structuredClone is a make-React-immutable button.
- _Skills: immutability, structuredClone, copy. Difficulty: advanced. ~14 min._

#### `ajr-l4-immutable-array-methods` - React 19 immutable array methods (toSorted/with)

- **Learn:** toSorted/toReversed/toSpliced/with return a new array and are the idiomatic state update.
- **See it live** (js-runnable): runs run toSorted/toReversed/toSpliced/with beside their mutating twins on a shared source
  - Watch: the new methods glowing green (source intact) next to the red mutators
- **Apply:** Rewrite `setRows(prev => { const c=[...prev]; c.sort(byName); return c })` and an index update using prev.toSorted(byName) and prev.with(i, ...).
- **Think about:**
  - What do these methods return and touch?
  - How does arr.with(i,v) differ from arr[i]=v?
  - What runtime support do they need?
- **Model answer outline:**
  - Fix: prev.toSorted(byName) and prev.with(i, { ...prev[i], on: true }).
  - Mechanism: the copying methods return a new array, elements shared by reference (structural sharing).
  - Spot in review: [...arr].sort()/.reverse() copies that simplify to the to* form.
  - Production symptom (fixed): clean immutable updates with no accidental mutation.
  - Misconception: you always need a full copy-then-mutate dance.
- _Skills: immutability, react19, arrays. Difficulty: beginner. ~10 min._

### Module 4.3 - State Shape & Sharing

#### `ajr-l4-structural-sharing` - Structural sharing: clone only the path you change

- **Learn:** New references for every node from root to the changed field, reusing untouched subtrees, is what makes memo skip work.
- **See it live** (js-runnable): runs a nested immutable update printing a reference-identity table for root, user, address, prefs, and a sibling
  - Watch: root/user/address marked new (fresh) and prefs/sibling marked reused (same), with a memo child on prefs NOT re-rendering
- **Apply:** Write updateCity(state, city) so user and address are new objects but state.user.prefs is the SAME reference, then assert next.user.prefs === prev.user.prefs.
- **Think about:**
  - Which nodes get a new reference and which stay?
  - Why does preserving refs make memo actually skip?
  - What does over-cloning cost?
- **Model answer outline:**
  - Fix: spread the spine (root -> user -> address), leave siblings alone.
  - Mechanism: memo/useMemo compare by reference, so preserving unchanged subtree refs is what skips work; this is what Immer/RTK do.
  - Spot in review: either a deep assignment (mutation) or a full deep clone (over-cloning).
  - Production symptom: over-cloning re-renders every memoized child; mutation skips renders.
  - Misconception: a full structuredClone per update is the immutable way.
- _Skills: immutability, structural-sharing, memo. Difficulty: advanced. ~16 min._

#### `ajr-l4-shared-init-object` - Shared reference from a module/prop initializer

- **Learn:** Initializing state from a module constant or a prop object shares one object across instances.
- **See it live** (react-demo): runs mount three form copies all using a shared module-level default object, then type a tag into one
  - Watch: the tag appearing in all three because they alias the same array, then the leak stopping with a factory initializer
- **Apply:** Given `const DEFAULT={tags:[]}; const [form,setForm]=useState(DEFAULT); ... form.tags.push(x)`, show every instance shares one tags array and fix the initializer.
- **Think about:**
  - What does useState(obj) store?
  - How does a module constant get shared across mounts?
  - What is the fix?
- **Model answer outline:**
  - Fix: lazy initializer useState(() => ({ tags: [] })) or clone at the boundary; never mutate props.
  - Mechanism: useState stores the reference; a module constant is created once and shared.
  - Spot in review: a state initializer that is a shared/imported object or a prop, plus a later mutation.
  - Production symptom: spooky cross-instance state; editing one form changes others.
  - Misconception: each component instance gets its own copy of a module-level default.
- _Skills: immutability, useState, sharing. Difficulty: intermediate. ~12 min._

#### `ajr-l4-derived-vs-stored-state` - Derived state vs stored state

- **Learn:** Copying props/state into new state plus a sync effect creates two sources of truth that drift.
- **See it live** (react-demo): runs two panels computing a filtered list: left stores it in state+useEffect, right derives it in render
  - Watch: the stored panel lagging one frame (flashing stale) and double-counting renders while the derived panel is correct in one pass
- **Apply:** Given `const [count,setCount]=useState(items.length); useEffect(()=>setCount(items.length),[items])`, delete the stored count and derive it inline; show the effect version renders twice.
- **Think about:**
  - Why does the effect version render twice?
  - When should you store vs compute?
  - How do you reset derived state on identity change?
- **Model answer outline:**
  - Fix: compute const count = items.length in render (useMemo only if measured expensive); use a key to reset.
  - Mechanism: setState in an effect renders once with the old value then again after the effect.
  - Spot in review: useState initialized from props plus a useEffect calling its setter from those props.
  - Production symptom: a stale value flashes for a frame and an extra render fires.
  - Misconception: you need an effect to keep derived state in sync.
- _Skills: derived-state, react, effects. Difficulty: intermediate. ~12 min._

#### `ajr-l4-ref-mutation-vs-state` - useRef mutation never re-renders (and when that is a bug)

- **Learn:** Reading a mutated ref in render gives stale UI because ref writes do not trigger a render.
- **See it live** (react-demo): runs a click handler that bumps both a ref and a state counter, rendering both labels
  - Watch: the ref-backed label staying at its initial value while the state-backed label updates, with a console overlay proving the ref write happened
- **Apply:** Explain why `const countRef=useRef(0); countRef.current++; return <span>{countRef.current}</span>` does not update on click, and decide when to use state vs ref.
- **Think about:**
  - Are ref writes visible to reconciliation?
  - What are the correct uses of a ref?
  - When does a value belong in state instead?
- **Model answer outline:**
  - Fix: if a value drives UI, put it in state; use refs for DOM nodes, timers, previous values, and non-render data.
  - Mechanism: ref.current writes are intentionally invisible to rendering.
  - Spot in review: ref.current mutated and then interpolated into JSX.
  - Production symptom: a number/label that never updates on screen despite the value changing.
  - Misconception: refs are a way to "avoid re-renders" for values that drive UI.
- _Skills: refs, react, state. Difficulty: intermediate. ~12 min._

---

## L5. The React Rendering Model

_Make re-renders visible: triggers, render vs commit, memo defeats, batching, reconciliation, keys, StrictMode._

### Module 5.1 - What Triggers a Re-render

#### `ajr-l5-what-triggers-rerender` - What actually triggers a re-render (the props myth)

- **Learn:** A re-render is triggered by the component own state/context or a parent rendering, not by props changing.
- **See it live** (react-demo): runs a Parent counter rendering a Child with static props, plus a memo toggle
  - Watch: the Child render-count badge ticking in lockstep with the parent even though its props never change, then freezing when memo is on
- **Apply:** A Child with unchanging props still re-renders on every parent count++; explain why, then stop it two ways (React.memo, and passing it as children).
- **Think about:**
  - What are the three triggers of a re-render?
  - Does a re-render always update the DOM?
  - Is re-rendering with identical props a bug?
- **Model answer outline:**
  - Fix: React.memo, or composition (colocate state / pass the child as children).
  - Mechanism: React recurses into children by default; it does not diff props before rendering (memo adds that compare).
  - Spot in review: state high in the tree with expensive leaves, causing wide wasted renders.
  - Production symptom: unnecessary CPU on every keystroke/tick in large trees.
  - Misconception: changing a prop triggers a childs render (it is the parent rendering that cascades).
- _Skills: react, rerender, memo. Difficulty: intermediate. ~14 min._

#### `ajr-l5-render-vs-commit` - Render phase vs commit phase

- **Learn:** Render computes elements (pure, disposable, can run twice); commit applies DOM, refs, and layout effects once.
- **See it live** (react-demo): runs a Profiler-style overlay with a render bar (can be discarded/restarted) and a commit bar (DOM mutation once), plus a component that pushes to an external array in render
  - Watch: render possibly running twice but commit exactly once, and the external array getting duplicate/garbage entries from the render-phase side effect
- **Apply:** A component mutates a ref counter and pushes to an external array in its body; explain the duplicate/garbage entries and move the write into an effect.
- **Think about:**
  - Why can a render run and be thrown away?
  - When are refs null and layout unreadable?
  - Where do side effects belong?
- **Model answer outline:**
  - Fix: move mutations/subscriptions/DOM reads into an effect (commit phase).
  - Mechanism: render must be pure and can be paused/aborted/restarted; only commit is the one-time real mutation.
  - Spot in review: any mutation, subscription, logging, or DOM read in the function body.
  - Production symptom: double-logged analytics, duplicated list entries, tearing.
  - Misconception: a render always commits and paints.
- _Skills: react, render-commit, purity. Difficulty: advanced. ~14 min._

#### `ajr-l5-bailout-object-is` - Bail-out on identical state (the set-same-value surprise)

- **Learn:** Setting state to an Object.is-equal value skips the re-render, including a mutated same reference.
- **See it live** (react-demo): runs a list where Add (mutate) pushes then setState(same ref) vs Add (new array)
  - Watch: a badge showing "render skipped (Object.is equal)" for the mutate path vs "render committed" for the new-array path
- **Apply:** Explain why `items.push(x); setItems(items)` never updates the list, in terms of the Object.is bail-out, then fix it.
- **Think about:**
  - What does React compare next state against?
  - Does setting a primitive to the same value re-render?
  - Why is immutability required not stylistic?
- **Model answer outline:**
  - Fix: produce a new reference (setItems([...items, x])).
  - Mechanism: React bails out when Object.is(next, current) is true; identity is the change signal.
  - Spot in review: state updated with push/splice/property assignment then setState of the same variable.
  - Production symptom: the UI will not update despite calling setState.
  - Misconception: React does deep/value equality on state.
- _Skills: react, object-is, immutability. Difficulty: intermediate. ~12 min._

### Module 5.2 - Referential Equality & memo

#### `ajr-l5-memo-defeated-inline-props` - Referential equality defeats React.memo

- **Learn:** A fresh inline object/array/function prop is a new reference each render, so shallow-equal always fails.
- **See it live** (react-demo): runs a memoized child receiving inline style={{}}, onSelect, and a freshly mapped array, with a render-count badge
  - Watch: the badge lighting red on every parent keystroke until the last unstable prop is stabilized, then going dark
- **Apply:** A `<ExpensiveList items={data} onSelect={()=>...} style={{padding:8}} />` under React.memo still re-renders every keystroke; identify the three unstable props and stabilize them.
- **Think about:**
  - What compare does memo do?
  - How many unstable props does it take to defeat memo?
  - What are useCallback/useMemo actually for here?
- **Model answer outline:**
  - Fix: useCallback the handler, useMemo/module-const the object and array (or rely on the compiler).
  - Mechanism: React.memo shallow-compares props with Object.is; {} !== {}, [] !== [], ()=>{} !== ()=>{}.
  - Spot in review: inline object/array/function literals passed to a memoized child.
  - Production symptom: a memo you added does nothing; expensive subtrees re-render on every keystroke.
  - Misconception: React.memo deep-compares props.
- _Skills: react, memo, referential-equality. Difficulty: intermediate. ~14 min._

#### `ajr-l5-usecallback-usememo-identity` - useCallback/useMemo preserve identity (and their dep trap)

- **Learn:** These hooks give a stable reference for downstream deps; an unstable dep makes them return a new reference every render.
- **See it live** (react-demo): runs a memoized child whose callback identity is shown as a hash badge, with a dep that is stable vs unstable
  - Watch: the hash changing each render (child flashes) when a dep is unstable, then freezing once the dep is stabilized
- **Apply:** Given `useCallback(fn, [filter])` where filter is an inline object rebuilt each render, trace why the callback identity still changes and fix the upstream dep.
- **Think about:**
  - What do these hooks compare deps with?
  - Why is a stable hook only as stable as its least-stable dep?
  - Can you rely on them for correctness?
- **Model answer outline:**
  - Fix: stabilize the upstream dependency (primitive or memoized), not just wrap the callback.
  - Mechanism: useMemo/useCallback cache by Object.is on deps; an unstable dep is a cache miss every render.
  - Spot in review: a useCallback/useMemo whose dep array holds an object/array/function built in render.
  - Production symptom: memoization silently does nothing because identity keeps churning.
  - Misconception: useMemo/useCallback guarantee a stable reference (React may drop the cache).
- _Skills: react, useCallback, identity. Difficulty: intermediate. ~12 min._

#### `ajr-l5-context-value-identity` - Context value identity re-renders every consumer

- **Learn:** A fresh object as the Provider value re-renders all consumers, even those reading an unchanged field.
- **See it live** (react-demo): runs a tree of consumer cards with render badges under a Provider whose value is an inline object
  - Watch: typing in an unrelated field re-rendering the provider and flashing ALL consumer badges, then only affected ones after useMemo/splitting
- **Apply:** Given `<Ctx.Provider value={{user,setUser}}>` where every consumer re-renders on unrelated renders, memoize the value and/or split contexts, and explain reference identity.
- **Think about:**
  - Do consumers re-render based on which field they read?
  - What are the two fixes?
  - Does React.memo protect against a context change?
- **Model answer outline:**
  - Fix: useMemo the value object, or split state and dispatch into separate contexts.
  - Mechanism: consumers re-render when the value identity changes by Object.is; an inline object is new each render.
  - Spot in review: <Provider value={{...}}> with an inline object literal.
  - Production symptom: one field change re-renders an entire app subtree (jank).
  - Misconception: memo stops a re-render caused by a consumed context change (context bypasses memo).
- _Skills: react, context, identity. Difficulty: advanced. ~14 min._

### Module 5.3 - State Updates & Batching

#### `ajr-l5-batching-functional-updater` - Batching and the functional updater

- **Learn:** Three setCount(count+1) in one handler only add 1 because each reads the same captured count.
- **See it live** (react-demo): runs an Add 3 button doing setCount(count+1) x3 vs setCount(c=>c+1) x3, plus a batched-renders badge
  - Watch: the captured version moving by 1 per click and the functional version by 3, and a badge proving all three updates cause ONE render
- **Apply:** Fix an increment handler that calls setCount(count+1) three times and only adds 1, using the functional updater, and explain what each call reads.
- **Think about:**
  - What value do all three setCount(count+1) read?
  - Why does setCount(c=>c+1) compose?
  - What does React 18 batching change?
- **Model answer outline:**
  - Fix: setCount(c => c + 1) so each update reads the latest queued state.
  - Mechanism: state is a per-render constant; batched setState(value) calls fold with last-write-wins; the updater reads the queue.
  - Spot in review: multiple setState of the same key in one handler using the state variable.
  - Production symptom: counters/quantities/cart totals that under-count.
  - Misconception: multiple setStates in a handler cause multiple renders.
- _Skills: react, batching, state. Difficulty: intermediate. ~12 min._

#### `ajr-l5-stale-reads-setstate` - Stale reads: state does not update synchronously

- **Learn:** Reading state right after setState (or in an async callback) gives the old value.
- **See it live** (react-demo): runs a Save handler that setStates then logs state on the next line, plus a setInterval logging a frozen count
  - Watch: the log showing the OLD value with a timeline of handler-runs-then-re-render, and the interval logging 0,0,0
- **Apply:** A handler does `setUser(next); analytics.track(user)` and sends the previous user; explain the closure and fix it.
- **Think about:**
  - Why is the state variable still old on the next line?
  - What do async callbacks capture?
  - How do you read the latest value reliably?
- **Model answer outline:**
  - Fix: use the value you just computed (next), a ref for latest reads, or an effect keyed on the state.
  - Mechanism: setState schedules; the current render scope keeps the old value until the next render.
  - Spot in review: reading a state variable on the line after its setter, or inside a long-lived callback.
  - Production symptom: wrong analytics payloads, off-by-one logs, wrong POST bodies.
  - Misconception: setState is synchronous.
- _Skills: react, state, stale-closure. Difficulty: intermediate. ~12 min._

#### `ajr-l5-lazy-initial-state` - Lazy initial state and expensive initializers

- **Learn:** useState(expensiveInit()) runs the call on every render; the lazy () => form runs it once.
- **See it live** (react-demo): runs an init-cost counter with useState(expensiveInit()) vs useState(()=>expensiveInit())
  - Watch: the eager version ticking the init counter on every render while the lazy version stays at 1
- **Apply:** Given `useState(parseHugeBlob(props.raw))` that reparses on every keystroke, change it to the lazy initializer and explain that the argument is evaluated each render but only used on mount.
- **Think about:**
  - Is the argument to useState evaluated every render?
  - When does the lazy initializer run?
  - Does the same trap apply to useRef(new Thing())?
- **Model answer outline:**
  - Fix: useState(() => parseHugeBlob(props.raw)); same lazy pattern for useRef.
  - Mechanism: useState(x) evaluates x every render but only uses it on mount; the () => form runs once.
  - Spot in review: a function CALL (not a function value) passed to useState/useRef that does real work.
  - Production symptom: silent CPU waste and jank on every render.
  - Misconception: the initializer only runs on mount regardless of form.
- _Skills: react, useState, performance. Difficulty: intermediate. ~10 min._

### Module 5.4 - Reconciliation & Keys

#### `ajr-l5-reconciliation-type-position` - Reconciliation diffs by type then position

- **Learn:** Changing an element type/position at a slot unmounts and remounts the subtree, wiping state/focus.
- **See it live** (react-demo): runs type into an uncontrolled input, then flip a toggle that changes the wrapper element type
  - Watch: the input text vanishing on the type-changing toggle (remount) but persisting when the type is stable, with a mount/unmount log
- **Apply:** Given `{cond ? <div><Input/></div> : <Input/>}` where toggling cond wipes the input text, explain the remount and restructure so the element type is stable.
- **Think about:**
  - What identity does React use for an element?
  - What does a remount reset?
  - Which patterns commonly change type at a slot?
- **Model answer outline:**
  - Fix: keep the element type stable at that position (do not swap parents/wrappers around it).
  - Mechanism: same type at same slot reuses the instance; a different type unmounts and remounts.
  - Spot in review: ternaries/conditionals rendering the same child under structurally different parents.
  - Production symptom: forms that clear themselves, lost focus, reset scroll.
  - Misconception: React tracks the JSX you wrote rather than (type, position/key).
- _Skills: react, reconciliation, remount. Difficulty: advanced. ~14 min._

#### `ajr-l5-index-as-key-bug` - Keys and the index-as-key bug

- **Learn:** key=index mismatches state to the wrong row after insert/delete/reorder.
- **See it live** (react-demo): runs a list of rows with uncontrolled inputs keyed by index, deleting/reordering rows, then switched to key={item.id}
  - Watch: text staying stuck on the wrong row with index keys, then following the correct item with stable id keys
- **Apply:** A todo list keyed by index leaves the wrong checkbox/text after deleting the first item; switch to a stable domain id key and explain the mismatch.
- **Think about:**
  - What do keys tell React across renders?
  - Why do index keys point at different data after a delete?
  - When is an index key acceptable?
- **Model answer outline:**
  - Fix: key={item.id} with a stable unique id; never Math.random().
  - Mechanism: index keys are positional, so after insert/delete React reuses the wrong instance state.
  - Spot in review: key={index} or key={Math.random()} on a mutable/reorderable list.
  - Production symptom: wrong checkbox checked, input text and focus jump to wrong rows.
  - Misconception: index keys are fine because the list renders.
- _Skills: react, keys, reconciliation. Difficulty: intermediate. ~12 min._

#### `ajr-l5-key-as-remount-tool` - Key as a remount tool (intentional state reset)

- **Learn:** Changing the key remounts a component, resetting state cleanly, the idiomatic reset.
- **See it live** (react-demo): runs a ProfileForm that keeps old edits on user switch without key vs resetting with key={userId}
  - Watch: the draft carrying over without key, and resetting with a mount counter incrementing only in the keyed version
- **Apply:** A ProfileForm keeps the previous user edits on navigation; reset it with `<ProfileForm key={userId} />` instead of syncing props to state in an effect.
- **Think about:**
  - What does changing a key do to a component?
  - Why is this better than a derived-state effect?
  - What does it cost?
- **Model answer outline:**
  - Fix: render <ProfileForm key={userId} /> to force a fresh mount on id change.
  - Mechanism: a changed key unmounts and remounts, resetting all internal state and re-running mount effects.
  - Spot in review: useEffect(() => setForm(initialFromProps), [id]) that could be a key.
  - Production symptom (fixed): clean reset instead of stale-state flashes and sync bugs.
  - Misconception: you must copy props into state to reset a form.
- _Skills: react, keys, reset. Difficulty: intermediate. ~10 min._

### Module 5.5 - StrictMode & Render Loops

#### `ajr-l5-strictmode-double-invoke` - StrictMode double-invocation

- **Learn:** Dev double-runs render, initializers, and mounts/unmounts effects once extra to surface impurity.
- **See it live** (react-demo): runs a component whose effect fetches /api/join firing twice and a useState(()=>makeId()) logging two ids, with a StrictMode toggle
  - Watch: an effect-run counter hitting 2 on mount and the initializer printing twice, then settling to a net 1 with cleanup + abort
- **Apply:** An effect double-POSTs and an initializer logs two ids in dev; make the effect idempotent with cleanup and explain why the double-run is a feature.
- **Think about:**
  - What does StrictMode double-invoke?
  - What does the extra mount->unmount->mount verify?
  - What is the correct fix vs the wrong fix?
- **Model answer outline:**
  - Fix: make effects idempotent (cleanup + AbortController), no side effects in render/initializers.
  - Mechanism: dev-only double-invoke stress-tests that setup and cleanup are symmetric; production runs once.
  - Spot in review: works in prod, duplicates in dev, plus effects lacking cleanup.
  - Production symptom: double subscriptions/POSTs/analytics when the same bug bites on real remounts.
  - Misconception: the double-run is a React bug to suppress by removing StrictMode.
- _Skills: react, strictmode, effects. Difficulty: intermediate. ~14 min._

#### `ajr-l5-infinite-render-loop` - Updating state during render / infinite loops

- **Learn:** A setter in the render body (or an effect with bad deps) spins the reconciler into a loop.
- **See it live** (react-demo): runs a component calling setOpen(true) in its body (Too many re-renders) and a useEffect(()=>setCount(count+1)) with no deps
  - Watch: a render-count meter running away to an error, then stabilizing after moving the setter into onClick / fixing deps
- **Apply:** A component calls setOpen(true) directly in its body and throws "Too many re-renders"; move it to an event handler and separately fix an effect that setStates a dep it lists.
- **Think about:**
  - Why does a setter in render loop?
  - Is there any legal setState-during-render case?
  - What is the better alternative to storing derived values?
- **Model answer outline:**
  - Fix: move the setter to an event handler / correct the deps; prefer deriving values in render.
  - Mechanism: an unconditional setter during render schedules another render immediately.
  - Spot in review: setX(...) at the top level of a component body, or an effect updating a dep it lists.
  - Production symptom: a frozen tab and "Maximum update depth exceeded".
  - Misconception: you can freely setState in render to compute values.
- _Skills: react, render-loop, effects. Difficulty: intermediate. ~12 min._

---

## L6. useEffect & Hooks

_The deepest nuance area: the dependency contract, cleanup races, when NOT to use an effect, refs, timing, and useEffectEvent._

### Module 6.1 - The Dependency Array

#### `ajr-l6-deps-reactivity-contract` - The dependency array is a reactivity contract

- **Learn:** Deps list every reactive value the effect reads; lying makes it read stale values and desync.
- **See it live** (react-demo): runs a chat-room effect connect(serverUrl, roomId) with [] deps, plus a roomId dropdown
  - Watch: the connected-to banner stuck on the first room while the dropdown changes, then logging disconnect(old)->connect(new) once roomId is a dep
- **Apply:** Given a chat effect with [] deps that never reconnects when roomId changes, make it reconnect without lying to the linter, and explain why [] was a bug not a feature.
- **Think about:**
  - What re-runs the effect?
  - What does an effect actually describe?
  - Why is exhaustive-deps a correctness lint?
- **Model answer outline:**
  - Fix: list roomId (and every reactive value read) so the effect re-synchronizes on change.
  - Mechanism: after each render React Object.is-compares deps and re-runs cleanup-then-effect on change.
  - Spot in review: an eslint-disable exhaustive-deps above a non-empty effect body.
  - Production symptom: the UI keeps talking to the old room/user/filter.
  - Misconception: [] means "run once" rather than "no reactive dependencies".
- _Skills: react, useEffect, deps. Difficulty: intermediate. ~14 min._

#### `ajr-l6-stale-closure-effect` - Stale closures in effects and intervals

- **Learn:** An effect/interval with [] closes over render-0 state forever.
- **See it live** (react-demo): runs a broken interval counter doing setCount(count+1) with [] deps and a captured-value panel
  - Watch: a number jumping 0->1 and freezing with the closure snapshot stuck at 0, then climbing after each fix
- **Apply:** Given the counter interval that sticks at 1, fix it three ways (functional updater, count in deps, latest ref) and articulate the tradeoffs.
- **Think about:**
  - Why does the callback see count as 0 forever?
  - How does the updater form sidestep it?
  - What does adding count to deps do to the timer?
- **Model answer outline:**
  - Fix: setCount(c=>c+1) (safe with []), a latest ref, or deps (recreates the interval each change).
  - Mechanism: a closure captures the variable binding from the render that created it; [] means render 0 forever.
  - Spot in review: setInterval/setTimeout/subscription in a [] effect reading state directly.
  - Production symptom: frozen counters, pollers using stale queries/tokens.
  - Misconception: adding the value to deps is always the right fix.
- _Skills: react, useEffect, stale-closure. Difficulty: intermediate. ~14 min._

#### `ajr-l6-object-function-deps-loop` - Object/function deps cause infinite loops

- **Learn:** A dep recreated every render is never Object.is-equal, so the effect runs every render.
- **See it live** (react-demo): runs const options={userId}; useEffect(()=>fetchData(options),[options]) with a render-count badge and a dep-diff panel
  - Watch: the render counter spinning (runaway loop, capped) with the dep-diff panel showing options is a new reference each render, stopping after the fix
- **Apply:** Given `const options={userId}; useEffect(()=>fetchData(options),[options])` that loops forever, fix it three ways and say which is best.
- **Think about:**
  - Why is {userId} never equal to the last render options?
  - What loop does a setState-in-effect create with this?
  - Which fix is preferred?
- **Model answer outline:**
  - Fix: depend on the primitive userId (best), construct the object inside the effect, or useMemo it.
  - Mechanism: Object.is on two distinct literals is always false, so the effect re-runs; setState makes it infinite.
  - Spot in review: an object/array/function created in the body appearing in a dep array.
  - Production symptom: infinite fetches / "Maximum update depth exceeded" freezing the tab.
  - Misconception: deps compare object contents.
- _Skills: react, useEffect, identity. Difficulty: intermediate. ~12 min._

### Module 6.2 - Cleanup & Races

#### `ajr-l6-cleanup-subscription-leak` - Cleanup and subscription leaks (double-fire in StrictMode)

- **Learn:** Missing/wrong cleanup leaks sockets and listeners; StrictMode dev double-mount exposes it.
- **See it live** (react-demo): runs a subscription effect with no return, mounted/unmounted repeatedly, with an active-connections meter
  - Watch: the meter climbing to 2 under StrictMode and leaving an orphan emitting, then settling at 1 with a clean connect/disconnect trace after cleanup
- **Apply:** Add cleanup to a subscription effect so it survives StrictMode mount->unmount->mount and does not orphan the old subscription on a userId change.
- **Think about:**
  - When does React run cleanup?
  - What is the idempotency/reversibility test for an effect?
  - Why does an inline arrow in add/remove leak?
- **Model answer outline:**
  - Fix: return a cleanup that unsubscribes/closes the exact resource opened; setup and teardown must be symmetric.
  - Mechanism: React runs cleanup before every re-run and on unmount; StrictMode runs setup->cleanup->setup to smoke out asymmetry.
  - Spot in review: addEventListener/socket/subscribe/setInterval with no return cleanup, or a hasRun guard hiding it.
  - Production symptom: duplicate handlers ("my message shows up twice, then 3x"), runaway connections.
  - Misconception: the double-invoke is a bug to fix by removing StrictMode.
- _Skills: react, cleanup, subscriptions. Difficulty: intermediate. ~14 min._

#### `ajr-l6-effect-fetch-race` - The effect fetch race (ignore flag / AbortController)

- **Learn:** Fast dep changes fire overlapping fetches; a slow earlier response paints the wrong data.
- **See it live** (react-demo): runs buttons for user A/B/C where A is 2000ms and B/C 100ms, buggy vs cleanup-guarded, plus a network panel
  - Watch: the header flickering to B then wrong-reverting to A, then the guard discarding the stale response while AbortController cancels the request
- **Apply:** Fix a broken profile loader that fetches on userId change with no guard, first with an ignore flag then AbortController, and explain why the flag alone still finishes the request.
- **Think about:**
  - What pairs each effect run with its cleanup?
  - What does the ignore flag prevent vs abort?
  - Why is fetch-in-effect discouraged now?
- **Model answer outline:**
  - Fix: let ignore=false in the effect, flip it in cleanup, guard setState; prefer AbortController to also cancel.
  - Mechanism: each effect+cleanup are a pair; the superseded effect no-ops on resolve; abort cancels the network too.
  - Spot in review: async work in an effect calling setState with no ignore flag or abort signal.
  - Production symptom: the wrong user/record renders after fast navigation.
  - Misconception: React 18 removing the unmount warning means the race is gone.
- _Skills: react, races, abort-controller. Difficulty: advanced. ~16 min._

#### `ajr-l6-async-effect-callback` - Async function as the effect callback breaks cleanup

- **Learn:** An async effect returns a Promise, which React treats as the cleanup function, so cleanup never runs.
- **See it live** (js-runnable): runs log what an async function returns (a Promise) vs a normal effect returning a function, against React cleanup contract
  - Watch: the effect return slot receiving a Promise instead of a cleanup function, so no teardown seam exists
- **Apply:** Given `useEffect(async () => { setData(await load()) }, [])`, refactor to a non-async effect with an inner async IIFE plus an ignore/abort cleanup, and say what React thought your returned Promise was.
- **Think about:**
  - What must the effect callback return?
  - What does an async function always return?
  - What breaks without a cleanup seam?
- **Model answer outline:**
  - Fix: keep the effect sync, define+call an inner async function, and return a real cleanup.
  - Mechanism: the return value is the cleanup slot; a Promise is not a function so cleanup is silently dropped.
  - Spot in review: the literal useEffect(async () => ...).
  - Production symptom: fetch races and subscription leaks that cannot be cancelled.
  - Misconception: the returned Promise is a harmless no-op.
- _Skills: react, useEffect, async. Difficulty: intermediate. ~12 min._

### Module 6.3 - When NOT to Use an Effect

#### `ajr-l6-derived-state-not-effect` - You might not need an effect (derived state)

- **Learn:** Storing computed values via an effect adds a render pass and flicker; compute in render instead.
- **See it live** (react-demo): runs const [fullName]=useState(); useEffect(()=>setFullName(first+" "+last),[first,last]) vs deriving in render, with a render-count badge
  - Watch: the effect version double-committing (2x per keystroke) while the derived version commits once
- **Apply:** Delete the fullName state and its effect and compute `const fullName = first + " " + last` in render; then move a POST-on-submit effect into the button onClick.
- **Think about:**
  - Why does the effect version render twice?
  - What is the decision rule for effect vs derive vs event?
  - How do you reset derived state on prop change?
- **Model answer outline:**
  - Fix: derive in render (useMemo if expensive); put user-event logic in handlers; reset with a key.
  - Mechanism: setState in an effect schedules a second render+commit after the first.
  - Spot in review: an effect whose only job is setX(...) from other reactive values.
  - Production symptom: extra renders and a stale value flashing for a frame.
  - Misconception: syncing state with an effect is the normal way to compute values.
- _Skills: react, derived-state, effects. Difficulty: intermediate. ~12 min._

#### `ajr-l6-effect-chains-cascade` - Effect chains and cascading renders

- **Learn:** Effects that setState which triggers another effect create multi-pass render waterfalls.
- **See it live** (react-demo): runs a form with 3 chained effects (A sets B, B sets C, C validates) with a render/commit counter and a step log
  - Watch: one user action fanning out into 4 sequential commits, then collapsing to 1 after refactoring to render-time computation
- **Apply:** Collapse a chain of effects (change A -> set B -> set C -> validate) into values computed in render plus a single event handler.
- **Think about:**
  - How many render passes does the chain cause?
  - What can be computed in render instead?
  - Why are effect chains brittle?
- **Model answer outline:**
  - Fix: derive during render and do multi-step updates in the triggering event handler.
  - Mechanism: each effect setState is another render round-trip that re-runs dependent effects.
  - Spot in review: a stack of effects where each dep is the previous effect setState target.
  - Production symptom: slow, hard-to-trace updates and momentarily inconsistent UI.
  - Misconception: chaining effects is a clean way to sequence derived updates.
- _Skills: react, effects, performance. Difficulty: advanced. ~14 min._

### Module 6.4 - Refs & Timing

#### `ajr-l6-latest-ref-pattern` - Refs and the latest-ref pattern

- **Learn:** A ref bridges reactive state into a non-reactive read so an effect uses fresh values without re-subscribing.
- **See it live** (react-demo): runs a useInterval where the latest callback is read each tick but the timer only resets when delay changes, naive vs latest-ref
  - Watch: the naive version resetting the timer on every keystroke (timing hitches) while the latest-ref version keeps steady cadence with fresh values
- **Apply:** Write a `useInterval(callback, delay)` that uses the latest callback each tick but only resets the timer when delay changes, and explain why putting callback in the interval deps is wrong.
- **Think about:**
  - Why does a ref read escape the dependency graph?
  - Where do you sync the ref?
  - Why avoid reading/writing refs during render?
- **Model answer outline:**
  - Fix: sync callbackRef.current in its own effect and call callbackRef.current() inside the interval.
  - Mechanism: ref mutation does not trigger a render and reading it is not tracked, so it escapes deps on purpose.
  - Spot in review: hand-rolled xxxRef.current = xxx feeding an effect (ask if useEffectEvent is cleaner).
  - Production symptom: timers/animations that reset and stutter on every unrelated state change.
  - Misconception: you must add the callback to deps to read fresh values.
- _Skills: react, refs, latest-ref. Difficulty: advanced. ~14 min._

#### `ajr-l6-uselayouteffect-vs-useeffect` - useLayoutEffect vs useEffect timing

- **Learn:** Reading layout in useEffect happens after paint (flicker); useLayoutEffect runs before paint.
- **See it live** (react-demo): runs a tooltip that measures height then flips above the cursor, written in useEffect (flickers) vs useLayoutEffect, with a paint-timeline strip
  - Watch: the useEffect tooltip rendering at the wrong spot for one frame then snapping, vs the useLayoutEffect version correct on first paint
- **Apply:** A tooltip measures then repositions in useEffect and flickers; switch the measure+reposition to useLayoutEffect and note the SSR warning.
- **Think about:**
  - What is the order: commit, layout effect, paint, effect?
  - When must you use useLayoutEffect?
  - Why not use it everywhere?
- **Model answer outline:**
  - Fix: measure and mutate in useLayoutEffect (synchronous, pre-paint); guard for SSR.
  - Mechanism: commit -> useLayoutEffect (blocking, pre-paint) -> paint -> useEffect (post-paint).
  - Spot in review: DOM measurement + style writes inside a plain useEffect, or heavy work in useLayoutEffect.
  - Production symptom: a one-frame flash/jump before elements settle.
  - Misconception: useLayoutEffect is a more reliable useEffect to default to.
- _Skills: react, useLayoutEffect, layout. Difficulty: advanced. ~12 min._

### Module 6.5 - useEffectEvent & Custom Hooks

#### `ajr-l6-useeffectevent` - useEffectEvent: separate reactive deps from latest reads

- **Learn:** An Effect Event re-runs the effect on some deps but reads the freshest value of others without re-syncing.
- **See it live** (react-demo): runs a chat effect that connects on roomId change but calls onConnected(theme) with current theme, switching theme and rooms fast
  - Watch: the effect only reconnecting on room change while the connect toast always shows the CURRENT theme, vs needless reconnects when theme is a dep
- **Apply:** Given a chat effect that connects on roomId but must toast the current theme, wrap the toast in useEffectEvent and explain why theme no longer belongs in deps.
- **Think about:**
  - What is reactive vs non-reactive here?
  - Why is useEffectEvent excluded from deps?
  - What is the rule about where you can call it?
- **Model answer outline:**
  - Fix: const onConn = useEffectEvent(() => toast(theme)); depend only on roomId.
  - Mechanism: an Effect Event is a non-reactive function that always reads current props/state and is excluded from deps.
  - Spot in review: a latest-ref shim feeding an effect, or a dep omitted with a disable comment.
  - Production symptom (fixed): correct latest reads without over-firing reconnections.
  - Misconception: you can pass an Effect Event to children or put it in deps (you cannot).
- _Skills: react, useEffectEvent, deps. Difficulty: advanced. ~14 min._

#### `ajr-l6-custom-hooks-encapsulate` - Custom hooks: encapsulate nuance without leaking bugs

- **Learn:** A custom hook is reused logic (each caller isolated); it must keep exhaustive deps and return stable identities.
- **See it live** (react-demo): runs two components sharing a useChatRoom hook, toggling a global input, with a returned callback identity badge on a memo child
  - Watch: both instances updating in sync while a returned callback keeps stable identity so a memoized child does not re-render
- **Apply:** Extract a raw effect+state into a named custom hook, keeping deps exhaustive inside and returning stable identities, and confirm consumers do not thrash.
- **Think about:**
  - Do custom hook instances share state?
  - Does extraction exempt exhaustive-deps?
  - Why return stable identities?
- **Model answer outline:**
  - Fix: name the hook by purpose, expose reactive inputs as args, keep internal deps exhaustive, return stable callbacks.
  - Mechanism: a custom hook is a function calling hooks; each call site gets independent state/effects.
  - Spot in review: a custom hook returning inline objects/functions or suppressing exhaustive-deps internally.
  - Production symptom: a bug or churn in shared code hits every consumer.
  - Misconception: a custom hook shares one store across callers.
- _Skills: react, custom-hooks, deps. Difficulty: intermediate. ~12 min._

---

## L7. Data Fetching in React

_N+1, waterfalls, and races in the wild: cancellation, caching/SWR, optimistic rollback, Suspense, RSC._

### Module 7.1 - Waterfalls & N+1

#### `ajr-l7-request-waterfall` - Client-side request waterfalls

- **Learn:** Independent requests run sequentially so total latency is the sum not the max.
- **See it live** (js-runnable): runs 3 (or 20) fake fetches (~600ms each) run sequentially vs Promise.all
  - Watch: two timing bars, ~1800ms stacked vs ~600ms overlapping, with a live ms counter
- **Apply:** Refactor three independent `await` fetches into Promise.all so combined latency equals the slowest call, and identify a genuinely dependent fetch that cannot be parallelized.
- **Think about:**
  - Which of these fetches actually depend on each other?
  - How does a parent-then-child fetch create an implicit waterfall?
  - What does hoisting fetch initiation (start early, await late) do?
- **Model answer outline:**
  - Fix: Promise.all for independent work; restructure or combine endpoints for dependent chains.
  - Mechanism: await serializes independent work; Promise.all overlaps and returns results in input order.
  - Spot in review: multiple sequential await fetch lines with no data dependency, or nested-component fetches.
  - Production symptom: pages that feel 3-5x slower than the network requires.
  - Misconception: Promise.all parallelizes any set of awaits (only independent ones).
- _Skills: react, waterfall, promise-all. Difficulty: intermediate. ~12 min._

#### `ajr-l7-n-plus-1-list` - N+1 fetch-per-item in a list

- **Learn:** A request per row produces N+1 round-trips, tripping rate limits and stalling render.
- **See it live** (react-demo): runs 25 rows each doing useEffect fetch by id, naive vs batched endpoint, with a network waterfall panel
  - Watch: the naive mode showing 25 concurrent request bars queued in stripes (browser 6-connection cap) vs one fat batched bar, counter 25 vs 1
- **Apply:** Turn `items.map(i => <Row id={i.id}/>)` where each Row fetches itself into one batched request for the whole list.
- **Think about:**
  - Why does each row fetch independently?
  - What is the browser per-origin connection cap?
  - Does dedup fix N distinct keys?
- **Model answer outline:**
  - Fix: batch endpoint (ids=...) / GraphQL / a DataLoader, or fetch joined data once in the parent.
  - Mechanism: each mounted child runs its own effect; no coordination means N calls, worsened by the ~6 connection cap.
  - Spot in review: a data hook/fetch inside a list item keyed by row id.
  - Production symptom: 50 rows fire 50 requests, hammering the API and stalling the page.
  - Misconception: a shared cache fixes N+1 (dedup only merges identical keys).
- _Skills: react, n-plus-1, batching. Difficulty: intermediate. ~14 min._

### Module 7.2 - Races & States

#### `ajr-l7-component-fetch-race` - The component fetch race and UI states

- **Learn:** Overlapping requests resolve out of order and overwrite correct UI; handle loading/error/empty too.
- **See it live** (react-demo): runs type user IDs fast with random 200-2000ms delays, unguarded vs ignore-flag+AbortController
  - Watch: the unguarded panel landing on the WRONG user with a log "resolved id=3 but current id=7 -> DROPPED", the guarded panel always correct
- **Apply:** Fix `useEffect(()=>{ fetchUser(id).then(setUser) }, [id])` so it never commits a stale response, and add loading/error/empty states.
- **Think about:**
  - Where do you set the ignore flag / call abort?
  - Must the id be in the deps?
  - What does abort add over the flag?
- **Model answer outline:**
  - Fix: ignore flag in cleanup and/or AbortController tied to the effect signal; render loading/error/empty explicitly.
  - Mechanism: effects run per committed render; overlapping promises resolve in completion order.
  - Spot in review: a fetch in useEffect with setState in .then and no cleanup, or deps missing the id.
  - Production symptom: a card briefly shows the wrong record after fast changes.
  - Misconception: React Query is overkill (it removes this by keying data by input).
- _Skills: react, races, fetch-states. Difficulty: advanced. ~14 min._

#### `ajr-l7-fetch-not-reject-http` - fetch does not reject on HTTP 4xx/5xx

- **Learn:** fetch resolves for a 500 with an HTML error page; code then JSON-parses garbage.
- **See it live** (js-runnable): runs hit an endpoint returning 500 with an HTML body, naive .then(r=>r.json()) vs a res.ok guard
  - Watch: the naive chain "succeeding" then blowing up at JSON.parse with "Unexpected token <", vs the guarded version throwing a clean 500
- **Apply:** Fix a `.then(r=>r.json())` chain to check res.ok before parsing, so Suspense/React Query error paths actually fire.
- **Think about:**
  - When does fetch actually reject?
  - What does React Query treat as an error?
  - How do axios/ky differ?
- **Model answer outline:**
  - Fix: if(!res.ok) throw new Error(res.status) before res.json().
  - Mechanism: fetch only rejects on network failure, never on HTTP status.
  - Spot in review: r => r.json() with no res.ok check.
  - Production symptom: error pages masquerade as data; "Unexpected token <" in logs.
  - Misconception: fetch rejects on a 500.
- _Skills: react, fetch, error-handling. Difficulty: beginner. ~12 min._

#### `ajr-l7-strictmode-double-fetch` - StrictMode double-fetch in development

- **Learn:** Dev double-invokes effects, so a naive fetch fires twice; the fix is cleanup, not removing StrictMode.
- **See it live** (react-demo): runs a request counter under StrictMode, naive vs AbortController-cleanup version
  - Watch: the counter reading "fetched twice" in dev, then effectively 1 committed with abort, with a "production = once" badge
- **Apply:** Show the dev double request, then demonstrate the correct response (AbortController cleanup or a keyed cache), not disabling StrictMode.
- **Think about:**
  - Why does the effect run twice in dev?
  - Does this happen in production?
  - What is the real fix?
- **Model answer outline:**
  - Fix: AbortController in cleanup (first request aborted) or a keyed cache; keep StrictMode.
  - Mechanism: dev mounts->unmounts->remounts to surface missing cleanup; production runs once.
  - Spot in review: removing StrictMode to "fix" duplicate requests.
  - Production symptom: on real remounts the same missing-cleanup bug double-fires.
  - Misconception: the dev double-fetch is a bug to silence.
- _Skills: react, strictmode, fetch. Difficulty: beginner. ~10 min._

### Module 7.3 - Caching, Dedup & SWR

#### `ajr-l7-cache-dedup-swr` - Caching, dedup, and stale-while-revalidate

- **Learn:** Data keyed by input dedups concurrent calls and serves cached data instantly, then revalidates.
- **See it live** (react-demo): runs mount 3 components using the same query key at once, then remount after staleTime, with a request counter and a stale badge
  - Watch: the counter reading 1 (deduped) not 3, and a remount showing cached data instantly with a background-refetch shimmer
- **Apply:** Replace a bespoke useEffect fetch hook with useQuery keyed by input; show two components sharing one request and a warm remount rendering instantly.
- **Think about:**
  - Why does keying by input dedupe mounts?
  - What is stale-while-revalidate?
  - What must the query key include?
- **Model answer outline:**
  - Fix: useQuery({ queryKey:["user",id], queryFn }); the key must include every input the queryFn depends on.
  - Mechanism: data keyed by input shares one cache entry and one in-flight promise; SWR returns cached then refetches if stale.
  - Spot in review: fetch-in-useEffect with local useState instead of a shared server-state cache.
  - Production symptom: re-request storms and spinners where cached data should appear.
  - Misconception: React auto-dedupes client fetches (dedup/cache is an RSC or query-lib feature).
- _Skills: react, caching, react-query. Difficulty: intermediate. ~14 min._

#### `ajr-l7-staletime-vs-gctime` - staleTime vs gcTime

- **Learn:** staleTime is freshness (suppress refetch); gcTime is retention of unused data in memory.
- **See it live** (react-demo): runs two timelines under a mounted query: a staleTime bar and a gcTime bar
  - Watch: the staleTime bar flipping fresh->stale (remount refetches only when stale), and the gcTime countdown starting only after the last observer unmounts
- **Apply:** Configure a query to show cached data with no refetch for 60s yet be garbage-collected 5min after the last consumer unmounts, using staleTime vs gcTime.
- **Think about:**
  - Which knob suppresses refetch on remount/focus?
  - When does the gcTime timer run?
  - What does staleTime:0 (default) cause?
- **Model answer outline:**
  - Fix: staleTime: 60000 for freshness, gcTime: 300000 for retention.
  - Mechanism: staleTime gates refetch triggers; gcTime evicts data only while it has zero active observers.
  - Spot in review: staleTime:0 on rarely-changing data (refetch storms), or huge gcTime expecting freshness.
  - Production symptom: constant background refetches or data that never refreshes.
  - Misconception: staleTime and gcTime are the same knob.
- _Skills: react-query, caching. Difficulty: advanced. ~12 min._

#### `ajr-l7-keep-previous-data` - Losing previous data on refetch (pagination flicker)

- **Learn:** A new query key is a cold cache entry, so pages flash a spinner and layout jumps.
- **See it live** (react-demo): runs a paginated table toggling keepPreviousData/placeholderData
  - Watch: the table blanking to a spinner with a layout jump when off, vs old rows staying dimmed until new rows swap in when on
- **Apply:** Add placeholderData: keepPreviousData so a paginated table never blanks between pages, and name the client-side equivalent.
- **Think about:**
  - Why does a new page key show a spinner?
  - What flag indicates placeholder data?
  - What is the useDeferredValue/startTransition analog?
- **Model answer outline:**
  - Fix: placeholderData: keepPreviousData (v5); dim UI while isPlaceholderData is true.
  - Mechanism: a new queryKey is a cold entry (undefined) until it loads; placeholderData keeps the last key data.
  - Spot in review: pagination reading data ?? [] and spinning on every page change.
  - Production symptom: full-page spinner and CLS/scroll jump on each page/filter change.
  - Misconception: you must show a spinner while the next page loads.
- _Skills: react-query, pagination, ux. Difficulty: intermediate. ~10 min._

### Module 7.4 - Mutations

#### `ajr-l7-optimistic-rollback` - Optimistic updates and rollback

- **Learn:** Optimistic UI needs cancel-in-flight, snapshot, and rollback; forgetting cancelQueries clobbers the write.
- **See it live** (react-demo): runs a like/counter button with a force-fail toggle, using onMutate/onError/onSettled
  - Watch: the success path confirming and the failure path visibly rolling back with a red flash and toast, on a timeline optimistic->error->rollback->refetch
- **Apply:** Write a mutation with onMutate (cancel + snapshot + optimistic), onError (restore), onSettled (invalidate), and a like button that reverts on a 500.
- **Think about:**
  - Why is cancelQueries the step people skip?
  - What do you return from onMutate?
  - How does React 19 useOptimistic compare?
- **Model answer outline:**
  - Fix: onMutate cancels in-flight queries, snapshots via getQueryData, sets optimistic, returns the snapshot; onError restores; onSettled invalidates.
  - Mechanism: without cancelQueries a background refetch can overwrite the optimistic value mid-mutation.
  - Spot in review: setQueryData optimistic write with no onError rollback or no cancelQueries.
  - Production symptom: a failed mutation leaves a phantom success on screen.
  - Misconception: optimistic update is just setQueryData before the call.
- _Skills: react-query, optimistic, mutations. Difficulty: advanced. ~16 min._

### Module 7.5 - Suspense & use()

#### `ajr-l7-use-stable-promise` - use() requires a cached/stable promise

- **Learn:** Passing a fresh promise to use() every render makes React suspend forever.
- **See it live** (react-demo): runs a component using use() with an inline promise vs a hoisted/cached one, with a render-count badge and a network counter
  - Watch: the inline version spinning forever with the render counter climbing, vs the cached version resolving once with counter=1
- **Apply:** Fix `function Profile(){ const u = use(fetchUser(id)) }` by hoisting/caching the promise and passing the stable promise in.
- **Think about:**
  - Why does a new promise identity re-suspend?
  - Where must the promise be created?
  - Can you try/catch use()?
- **Model answer outline:**
  - Fix: create the promise in a cache/parent/RSC and pass the same promise into use().
  - Mechanism: use() suspends until the promise settles; a new promise each render restarts the cycle.
  - Spot in review: use(fetchX(...)) created inline in a client render.
  - Production symptom: an infinite spinner / network hammering.
  - Misconception: use() creates or caches the promise for you.
- _Skills: react19, suspense, use. Difficulty: advanced. ~14 min._

#### `ajr-l7-suspense-boundary-granularity` - Suspense reveal order and ErrorBoundary placement

- **Learn:** One coarse boundary blocks the whole page; ErrorBoundary must wrap Suspense.
- **See it live** (react-demo): runs a dashboard of 3 tiles with staggered delays and one that rejects, single outer boundary vs per-tile boundaries + error boundary
  - Watch: the single-boundary version blanking the whole page and crashing on the failure, vs tiles popping in independently with the failing tile showing a local error
- **Apply:** Wrap independent sections in their own Suspense with an ErrorBoundary outside each, so a slow/failing widget does not stall or crash the rest.
- **Think about:**
  - What does a Suspense boundary wait for?
  - Why must ErrorBoundary wrap Suspense not nest inside?
  - How does startTransition avoid fallback flashes?
- **Model answer outline:**
  - Fix: per-section Suspense with an ErrorBoundary outside each; use startTransition to keep current UI on updates.
  - Mechanism: Suspense shows fallback until all suspending reads inside resolve; ErrorBoundary catches rejections.
  - Spot in review: one top-level Suspense, or ErrorBoundary nested inside Suspense.
  - Production symptom: the whole page waits on the slowest fetch, or one failure blanks everything.
  - Misconception: more boundaries are always better (over-nesting adds spinner confetti).
- _Skills: react, suspense, error-boundary. Difficulty: advanced. ~14 min._

### Module 7.6 - RSC Fetching

#### `ajr-l7-rsc-server-waterfall` - RSC server waterfalls, memoization, and preload

- **Learn:** Nested async server components serialize awaits into a server waterfall invisible in the network tab.
- **See it live** (js-runnable): runs a mock of the server render: three mocked async data loads awaited sequentially, then the same three hoisted and run together with Promise.all, timing each pass
  - Watch: two timing bars, the sequential pass a stacked staircase of three back-to-back loads collapsing to three overlapped bars in the parallel pass, plus a "DB queries: 1" badge instead of 4 once identical loads dedupe
- **Apply:** Convert a parent server component that awaits then renders an awaiting child into a hoisted preload() plus React cache()-wrapped access so identical calls dedupe.
- **Think about:**
  - Why do nested awaits serialize on the server?
  - What does React cache() dedupe?
  - What does preload (fire early, await late) do?
- **Model answer outline:**
  - Fix: hoist preload() high in the tree and wrap non-fetch data access in React cache().
  - Mechanism: an async server component blocks its subtree until its await settles; fetch is memoized per request, DB access is not.
  - Spot in review: nested await in server components with no preload, or direct DB calls not wrapped in cache().
  - Production symptom: slow server render with serialized DB round-trips invisible in the browser network tab.
  - Misconception: RSC has no waterfalls.
- _Skills: rsc, waterfall, cache. Difficulty: advanced. ~16 min._

#### `ajr-l7-over-under-fetching` - Over-fetching and under-fetching

- **Learn:** Over-fetching ships unused fields; under-fetching forces extra round-trips.
- **See it live** (js-runnable): runs fetch a fat 40-field JSON vs a projected one, then a list missing author names triggering follow-up calls
  - Watch: two payload-size bars (30KB vs 1KB) with parse-time counters, and waterfall bars for the under-fetch follow-ups
- **Apply:** Introduce field selection (GraphQL / sparse fieldset / a React Query select) so a name+avatar view fetches only what it renders, shrinking the payload.
- **Think about:**
  - What does over-fetching cost on mobile?
  - What does under-fetching cause?
  - What is the reuse tradeoff of a generic endpoint?
- **Model answer outline:**
  - Fix: select only needed fields (GraphQL/sparse fieldset, or a React Query select transform).
  - Mechanism: transferring/parsing unused fields costs bandwidth and main-thread parse time; missing fields cause follow-up waterfalls.
  - Spot in review: a component destructuring 3 fields off a 40-field response, or a render triggering a second fetch for a label.
  - Production symptom: slow, heavy responses or chatty N+1 follow-ups.
  - Misconception: reusing one generic endpoint everywhere is free.
- _Skills: react, fetching, performance. Difficulty: intermediate. ~12 min._

---

## L8. Performance & Re-render Optimization

_Measure before memoizing: diagnose wasted renders, memo economics, composition, context, virtualization, bundle._

### Module 8.1 - Diagnosis

#### `ajr-l8-render-propagation-model` - The default render-propagation model

- **Learn:** A parent render re-renders all descendants by default, regardless of whether props changed.
- **See it live** (react-demo): runs a Parent -> Child -> Grandchild tree with render-count badges, plus a memo toggle on Child
  - Watch: clicking a button that only changes Parent state flashing all three badges, then only Parent after wrapping Child in memo
- **Apply:** A HeavyChild with no props re-renders on parent count++; explain why, then fix it with React.memo and with the children pass-through.
- **Think about:**
  - Does React diff props before rendering by default?
  - Is a re-render a DOM update?
  - What is the cheapest fix, memo or composition?
- **Model answer outline:**
  - Fix: state colocation / composition first; React.memo where a subtree is genuinely expensive.
  - Mechanism: rendering recurses into children; memo is the opt-in that adds a shallow compare.
  - Spot in review: state high in the tree with expensive leaves.
  - Production symptom: wide wasted renders costing CPU on every update.
  - Misconception: changing a prop triggers a childs render (the parent rendering cascades down).
- _Skills: react, performance, rerender. Difficulty: intermediate. ~12 min._

#### `ajr-l8-profiler-diagnosis` - Diagnosing with the Profiler

- **Learn:** Use the Profiler flamegraph and "why did this render" instead of memoizing by guesswork.
- **See it live** (react-demo): runs a mini render-timeline where each commit is a bar colored by duration with a "rendered because" tooltip, over a form that re-renders a 500-row table per keystroke
  - Watch: a fat bar appearing every keystroke with the render reason, shrinking to slivers after the one-line fix
- **Apply:** Using the Profiler, identify which commit is expensive and which prop/state triggered it, then write the one-line fix, reading the flamegraph not the code.
- **Think about:**
  - What are the three render reasons?
  - What does baseDuration ~ actualDuration tell you?
  - Why measure in a production build?
- **Model answer outline:**
  - Fix: attribute the render (parent/props/hook/context), then stabilize the specific trigger.
  - Mechanism: the Profiler reports actualDuration vs baseDuration and the render reason per commit.
  - Spot in review: memoization added with no measured hot path.
  - Production symptom: keystroke/scroll jank from a single expensive commit.
  - Misconception: dev-build timings (slower, StrictMode double-render) reflect real cost.
- _Skills: react, profiler, performance. Difficulty: advanced. ~14 min._

### Module 8.2 - Memo Economics

#### `ajr-l8-memo-shallow-compare` - React.memo shallow compare and what defeats it

- **Learn:** One inline object/array/function/children prop makes every prop compare fail.
- **See it live** (react-demo): runs a memoized child with a checklist of props (object, array, callback, primitive), parent re-rendering on a timer
  - Watch: the render badge staying red until the last unstable prop is stabilized, then going dark
- **Apply:** A memoized <Row> receiving inline style={{}} and onClick={()=>...} still re-renders; find why memo does nothing and fix the unstable props.
- **Think about:**
  - What compare does memo perform?
  - How many unstable props defeat it?
  - When is memo net-negative?
- **Model answer outline:**
  - Fix: stabilize every non-primitive prop (useCallback/useMemo/module const) or rely on the compiler.
  - Mechanism: memo shallow-compares props with Object.is; a new literal is never equal.
  - Spot in review: React.memo plus an inline object/arrow prop at the call site (grep call sites).
  - Production symptom: a memo that costs a compare and never bails.
  - Misconception: memo is a free performance win.
- _Skills: react, memo, performance. Difficulty: intermediate. ~12 min._

#### `ajr-l8-usecallback-usememo-stability` - useCallback/useMemo and dep transitivity

- **Learn:** A hook is only as stable as its least-stable dependency.
- **See it live** (react-demo): runs a memoized callback identity shown as a hash badge next to a child render count, with a stable vs unstable dep
  - Watch: the hash changing each render (child flashes) when a dep is unstable, freezing once fixed
- **Apply:** Stabilize an onSelect handler so a memoized <List> stops re-rendering, given a useCallback whose dep (filter) is rebuilt inline; trace the identity and fix upstream.
- **Think about:**
  - What do these hooks cache on?
  - Why does an unstable dep cause a cache miss?
  - Are they a correctness guarantee?
- **Model answer outline:**
  - Fix: stabilize the upstream dep, not just wrap the callback.
  - Mechanism: useMemo/useCallback compare deps with Object.is; an unstable dep is a miss every render.
  - Spot in review: a useCallback/useMemo dep array holding an object/array/function built in render.
  - Production symptom: memoization silently does nothing.
  - Misconception: these hooks guarantee a stable reference across all renders.
- _Skills: react, useCallback, performance. Difficulty: intermediate. ~12 min._

#### `ajr-l8-when-memo-hurts` - When memoization hurts (the cost model)

- **Learn:** Memoizing trivially-cheap components adds compare + memory cost and can be slower.
- **See it live** (react-demo): runs two identical 3-item lists side by side, one fully memoized, one plain, with cumulative time counters under rapid re-renders
  - Watch: the memoized side counter ticking up FASTER because the children are trivially cheap (compare overhead)
- **Apply:** Decide which of four components should keep memo/useMemo and remove the rest, with a one-line justification each (a memoized Icon, a useMemo over arr.length, an expensive sort).
- **Think about:**
  - What is the cost of memo per render?
  - When is useMemo over cheap arithmetic slower?
  - What is the memoize heuristic?
- **Model answer outline:**
  - Fix: memoize expensive/wide subtrees or props feeding other memo boundaries, not everything.
  - Mechanism: memo pays a shallow compare + retained memory each render; the benefit is a skipped render.
  - Spot in review: memo/useMemo with no measured hot path behind it.
  - Production symptom: slower renders from speculative memoization.
  - Misconception: memoize everything for performance.
- _Skills: react, memo, performance. Difficulty: advanced. ~12 min._

#### `ajr-l8-react-compiler-auto-memo` - React Compiler auto-memoization and its bailouts

- **Learn:** The compiler auto-memoizes rules-compliant components but silently bails on unsupported patterns.
- **See it live** (react-demo): runs a compiler ON/OFF toggle over a clean component and over one with mutation-in-render, with a render badge
  - Watch: the clean component staying green with zero manual hooks when ON, but the mutating variant not benefiting when ON (note: the React Compiler is a build-time transform; this toggle is a hand-wired useMemo/useCallback approximation of what the compiler does automatically, not the compiler running live)
- **Apply:** A component was fast with manual memo and slow after deletion under the compiler; explain the bailout (mutation / try-catch in render) and make it compiler-safe.
- **Think about:**
  - What does the compiler assume?
  - What patterns make it bail silently?
  - What does it NOT fix?
- **Model answer outline:**
  - Fix: follow the Rules of React (no mutation, pure render) so the compiler can memoize; keep manual memo at interop/effect-dep edges.
  - Mechanism: the compiler statically analyzes data flow and injects fine-grained memoization; it leaves bailed code untouched.
  - Build-time vs runtime: the compiler runs at build time (a Babel transform) and cannot be toggled at runtime; the shipped bundle has no on/off switch, only the memoized output it already emitted.
  - Spot in review: after adopting the compiler, deleting all manual memo blindly (verify with the Profiler and the lint).
  - Production symptom: surprise perf regressions in bailed-out components.
  - Misconception: the compiler removes all re-renders and fixes architecture.
- _Skills: react19, compiler, performance. Difficulty: advanced. ~14 min._

### Module 8.3 - Composition Over Memo

#### `ajr-l8-children-passthrough` - Composition / children as the memo-free fix

- **Learn:** Passing expensive UI as children keeps it referentially stable so it does not re-render.
- **See it live** (react-demo): runs a color-picker input driving fast state next to an ExpensiveTree, state-in-parent vs ExpensiveTree-passed-as-children
  - Watch: the ExpensiveTree render badge flashing every keystroke in version A and never flashing in version B
- **Apply:** Fix a re-render WITHOUT React.memo: a component owns fast-changing state and renders an expensive sibling; extract the state into a small child and pass the expensive tree as children.
- **Think about:**
  - Why is a child passed as children referentially stable?
  - What are the two structural moves?
  - Why prefer this over memo?
- **Model answer outline:**
  - Fix: push state down into a small component, or lift the expensive content up and pass it as children.
  - Mechanism: children created by a non-re-rendering parent keep the same reference, so React bails out of that subtree.
  - Spot in review: a component that owns volatile state and renders heavy siblings inline.
  - Production symptom: an expensive tree re-rendering on every keystroke.
  - Misconception: React.memo is the first tool to reach for.
- _Skills: react, composition, performance. Difficulty: intermediate. ~12 min._

#### `ajr-l8-state-colocation` - State colocation vs lifting state too high

- **Learn:** State higher than needed turns a local update into a whole-page re-render.
- **See it live** (react-demo): runs a dashboard of 6 badged panels with search state at App level vs moved into the Results panel
  - Watch: typing flashing all 6 panels with App-level state, then only the Results panel after colocation
- **Apply:** Move App-level search state (consumed by one panel) down so only the search results re-render.
- **Think about:**
  - What determines the render blast radius?
  - How low should state live?
  - What is the over-colocation risk?
- **Model answer outline:**
  - Fix: colocate state at the lowest common ancestor of its consumers.
  - Mechanism: the render blast radius equals the subtree under the component owning the state.
  - Spot in review: a top-level useState read by one deep leaf.
  - Production symptom: an entire dashboard re-renders on one input keystroke.
  - Misconception: lift state up is always right.
- _Skills: react, colocation, performance. Difficulty: intermediate. ~10 min._

### Module 8.4 - Context & Stores

#### `ajr-l8-context-splitting` - Context re-renders and splitting providers

- **Learn:** A new value object re-renders every consumer; split or memoize to fix.
- **See it live** (react-demo): runs one Provider feeding 3 consumers (reads user / reads theme / reads nothing) with render badges
  - Watch: changing theme flashing all three, then only the theme consumer after splitting into UserContext + ThemeContext
- **Apply:** Stop a DeepConsumer that only reads user from re-rendering when only theme changes, by splitting the context and/or memoizing the value.
- **Think about:**
  - Do consumers re-render by field or by value identity?
  - What are the two fixes?
  - Does context have a built-in selector?
- **Model answer outline:**
  - Fix: split fat context into narrow contexts (state vs dispatch), and/or useMemo the value.
  - Mechanism: consumers subscribe to the value identity via Object.is; a new value re-renders all.
  - Spot in review: <Ctx.Provider value={{...}}> with an inline object.
  - Production symptom: an unrelated field change re-renders a large subtree.
  - Misconception: context lets you subscribe to a single field out of the box.
- _Skills: react, context, performance. Difficulty: intermediate. ~12 min._

#### `ajr-l8-usesyncexternalstore-snapshot` - useSyncExternalStore getSnapshot must be cached

- **Learn:** A getSnapshot that builds a new object each call loops or throws "should be cached".
- **See it live** (react-demo): runs a store hook with getSnapshot returning state.items.filter(...) fresh each call vs a cached snapshot
  - Watch: the uncached version throwing/looping with a spinning render counter, the cached version settling
- **Apply:** Given `useSyncExternalStore(sub, () => state.items.filter(i=>i.on))`, explain the infinite loop and fix it by caching the derived snapshot.
- **Think about:**
  - Why does a new ref each call loop?
  - What must a mutable store return?
  - Why do Zustand/Redux selectors need shallow equality?
- **Model answer outline:**
  - Fix: cache the derived snapshot and return the same ref until inputs change; provide getServerSnapshot.
  - Mechanism: React Object.is-compares getSnapshot to the last value; a new ref every time reads as constant change.
  - Spot in review: a getSnapshot/selector that maps/filters/spreads on every call.
  - Production symptom: an error overlay or a frozen re-render loop.
  - Misconception: getSnapshot can return derived arrays/objects inline.
- _Skills: react, useSyncExternalStore, stores. Difficulty: advanced. ~14 min._

### Module 8.5 - Big Lists & Transitions

#### `ajr-l8-virtualization` - List virtualization (windowing)

- **Learn:** Rendering 10k DOM nodes tanks mount, scroll FPS, and memory; render only the visible window.
- **See it live** (react-demo): runs a 50k-row list with a virtualized toggle, a live DOM-node counter, and an FPS meter during auto-scroll
  - Watch: thousands of nodes and dropping FPS when off, vs ~30 nodes and pinned FPS when on
- **Apply:** Render a 50k-row table without freezing the tab by swapping a plain .map for a virtualizer, and handle a variable-height measurement.
- **Think about:**
  - What is actually mounted with virtualization?
  - Why do variable heights need measurement?
  - What does it break (find, a11y, anchors)?
- **Model answer outline:**
  - Fix: render only the viewport window (+overscan) with stable keys; measure/estimate variable rows.
  - Mechanism: off-screen rows are replaced by a computed-height spacer.
  - Spot in review: a .map over an unbounded list rendering rich rows.
  - Production symptom: janky scroll and slow mount on long lists.
  - Misconception: virtualization is free (it breaks Ctrl-F, off-screen a11y, anchor links).
- _Skills: react, virtualization, performance. Difficulty: advanced. ~14 min._

#### `ajr-l8-usetransition-responsive` - useTransition keeps the UI responsive

- **Learn:** Wrapping a heavy non-urgent update in startTransition lets React interrupt it so input stays crisp.
- **See it live** (react-demo): runs a search input over a 20k-row list with a render-count/FPS badge, without vs with useTransition
  - Watch: keystrokes stuttering and the input lagging without a transition, vs the input staying crisp with the list catching up behind a pending badge
- **Apply:** Keep the input responsive while filtering a 20k-row list by splitting urgent input state from a transition-wrapped filter update, and show isPending.
- **Think about:**
  - What does startTransition mark an update as?
  - Which state stays urgent?
  - What does React do to the event loop to make this work?
- **Model answer outline:**
  - Fix: keep the input value urgent; wrap the derived heavy update in startTransition and show isPending.
  - Mechanism: the concurrent scheduler slices the low-priority render and yields via a macrotask so input/paint happen between slices.
  - Spot in review: a heavy list/route update in an onChange with no transition/deferral.
  - Production symptom: input lag and dropped characters while a big list re-renders.
  - Misconception: the React Compiler makes blocking renders async (it only memoizes).
- _Skills: react19, useTransition, performance. Difficulty: advanced. ~14 min._

#### `ajr-l8-usedeferredvalue` - useDeferredValue and the deliberately-stale render

- **Learn:** A lagging copy keeps input responsive but shows stale data for a beat; mark it and do not treat it as a debounce.
- **See it live** (react-demo): runs an input feeding a heavy Results with a deferred query and an isStale dim
  - Watch: the live query and deferredQuery visibly lagging apart while typing, and results dimming when they differ then snapping back
- **Apply:** Let a results list lag behind the input without blocking typing and visually mark staleness with isStale = query !== deferredQuery.
- **Think about:**
  - Is useDeferredValue a debounce?
  - Where does the stale window come from?
  - What must the heavy child also do?
- **Model answer outline:**
  - Fix: pass a deferred query and dim results while value !== deferredValue; memoize the heavy child.
  - Mechanism: React renders once with the old value (committed) then re-renders with the new value at low priority.
  - Spot in review: useDeferredValue used as a fixed-delay debounce.
  - Production symptom (fixed): responsive input with a briefly-stale list instead of jank.
  - Misconception: useDeferredValue adds a fixed delay.
- _Skills: react, useDeferredValue, performance. Difficulty: advanced. ~12 min._

### Module 8.6 - Code Splitting & Bundle

#### `ajr-l8-code-splitting-lazy` - Code splitting with React.lazy and Suspense

- **Learn:** Lazy-load heavy routes/components; common mistakes (lazy in render, missing Suspense) reintroduce bugs.
- **See it live** (react-demo): runs an app importing a 300KB chart eagerly vs React.lazy + Suspense, with an initial-bundle meter and a per-tab chunk list
  - Watch: the initial bundle huge when eager, then dropping with a new chunk downloading only when the tab opens
- **Apply:** Load a 300KB chart library only when the Analytics tab opens, using React.lazy + Suspense, and confirm the chunk splits.
- **Think about:**
  - What does dynamic import produce?
  - Why must React.lazy be at module scope?
  - What is a lazy waterfall?
- **Model answer outline:**
  - Fix: const Chart = React.lazy(() => import("./Chart")) at module scope, wrapped in a Suspense boundary.
  - Mechanism: dynamic import produces a separate chunk loaded on demand; React.lazy suspends until it resolves.
  - Spot in review: React.lazy declared inside a component, or lazy with no Suspense ancestor.
  - Production symptom: a giant initial bundle blocking first paint.
  - Misconception: over-splitting into many tiny chunks is better (adds request overhead).
- _Skills: react, code-splitting, bundle. Difficulty: intermediate. ~12 min._

#### `ajr-l8-bundle-bloat-treeshaking` - Bundle bloat: tree-shaking and barrel files

- **Learn:** Barrel imports and non-tree-shakeable libs pull dead weight no runtime memo fixes.
- **See it live** (react-demo): runs a treemap of bundle contents where each library is a sized rectangle, toggling barrel vs specific-path imports
  - Watch: the rectangles and total visibly shrinking/growing as import style changes
- **Apply:** Cut 200KB from the client bundle: switch a lodash root import and an icon barrel to per-path imports and shrink a "use client" boundary, reading the analyzer diff.
- **Think about:**
  - What defeats tree-shaking?
  - How much does import style change for large libs?
  - What ships under a "use client" tree?
- **Model answer outline:**
  - Fix: per-path imports (or lodash-es), and push "use client" down so only small islands ship.
  - Mechanism: tree-shaking needs static ESM + sideEffects:false; barrel re-exports and non-ESM libs defeat it.
  - Spot in review: root-package imports of big libs, giant barrels, and a top-level "use client".
  - Production symptom: tens of KB of dead code in the client bundle.
  - Misconception: intuition beats a bundle analyzer.
- _Skills: bundle, tree-shaking, rsc. Difficulty: advanced. ~14 min._

#### `ajr-l8-rsc-move-off-client` - Server Components as a perf lever

- **Learn:** Rendering on the server ships zero component JS; misplaced "use client" throws that away.
- **See it live** (react-demo): runs a component tree colored server vs client with a client-JS meter, dragging the "use client" boundary
  - Watch: branches turning green (server) and the client-JS meter dropping as the boundary moves down
- **Apply:** A markdown + syntax-highlight component ships 400KB to the client for static content; make it a Server Component and keep only the interactive bit client.
- **Think about:**
  - What ships to the client for a server component?
  - What can server components not do?
  - Where should "use client" live?
- **Model answer outline:**
  - Fix: keep static formatting/data on the server; put interactivity in small client leaves.
  - Mechanism: server components render to a payload and never hydrate; only "use client" subtrees ship JS and re-render.
  - Spot in review: "use client" at a page root, or static/data libs imported into client components.
  - Production symptom: heavy libs and static work shipped to and run on the client.
  - Misconception: client memoization is the biggest perf lever (moving to the server often is).
- _Skills: rsc, performance, bundle. Difficulty: advanced. ~14 min._

---

## L9. Memory Leaks, Lifecycle, Forms & Events

_The leaks and input traps that only show in real use: orphaned timers/subscriptions, controlled inputs, double-submit, focus._

### Module 9.1 - Leaks: Timers & Subscriptions

#### `ajr-l9-leaking-timers` - Leaking timers (interval/timeout/rAF)

- **Learn:** An interval that outlives the component keeps firing and holding its closure.
- **See it live** (react-demo): runs mount/unmount a Clock 5 times via a toggle, with a badge counting active intervals
  - Watch: the badge climbing 1,2,3 and the time jittering (multiple intervals) without cleanup, staying at 1 with clearInterval
- **Apply:** Add cleanup to `useEffect(()=>{ const id=setInterval(()=>setNow(Date.now()),1000) }, [])`, and for rAF add cancelAnimationFrame.
- **Think about:**
  - Why is the timer not tied to React tree lifecycle?
  - How does StrictMode help you detect this?
  - What about self-scheduling setTimeout recursion?
- **Model answer outline:**
  - Fix: return () => clearInterval(id) (and cancelAnimationFrame for rAF).
  - Mechanism: the callback is registered on the host timer queue, retaining component scope until cleared.
  - Spot in review: setInterval/setTimeout/rAF in an effect with no matching clear in cleanup.
  - Production symptom: runaway CPU, ghost callbacks, and setState-after-unmount storms.
  - Misconception: unmounting stops the timer.
- _Skills: react, leaks, timers. Difficulty: intermediate. ~12 min._

#### `ajr-l9-leaking-subscriptions` - Leaking subscriptions (socket/store/onSnapshot)

- **Learn:** An unclosed subscription multiplies on remount and pushes updates into dead components.
- **See it live** (react-demo): runs a mock pub/sub bus with a subscribers counter, mounting/unmounting a Feed repeatedly
  - Watch: the bus showing N live subscribers all receiving each message (duplicate rows) without cleanup, back to 1 with unsubscribe
- **Apply:** Add the missing cleanup to `useEffect(()=>{ const unsub = store.subscribe(setState) }, [])` (or socket.on / onSnapshot).
- **Think about:**
  - What holds a reference to your callback?
  - What is each sources teardown?
  - What is the correct primitive for external stores?
- **Model answer outline:**
  - Fix: return the unsubscribe/off/close/disconnect for the exact source; use useSyncExternalStore for stores.
  - Mechanism: the external source strongly references your callback; unmount does not reach into it.
  - Spot in review: any subscribe/on/connect without a symmetric teardown in cleanup.
  - Production symptom: "my message shows up twice, then 3x" and climbing connections.
  - Misconception: React auto-unsubscribes on unmount.
- _Skills: react, leaks, subscriptions. Difficulty: intermediate. ~12 min._

#### `ajr-l9-leaking-listeners-identity` - Leaking listeners and stale removeEventListener

- **Learn:** addEventListener with an inline arrow can never be removed (reference mismatch).
- **See it live** (js-runnable): runs register N resize handlers then try to remove with a fresh arrow each time, then with a named handler
  - Watch: a listener counter that never drops with inline arrows, going to 0 with a stable named handler; a React companion showing window handlers climbing on remount
- **Apply:** Fix `useEffect(()=>{ window.addEventListener("resize", ()=>setW(...)) }, [])` with two bugs: add cleanup, and make add/remove reference the same function.
- **Think about:**
  - What does removeEventListener match on?
  - Why does an inline arrow silently fail to remove?
  - What stale value does the handler capture?
- **Model answer outline:**
  - Fix: define a named handler, add and remove the same reference, and match the options object.
  - Mechanism: removeEventListener matches by (type, function reference, capture); an inline arrow is a new reference.
  - Spot in review: addEventListener with an inline function, or on window/document with no exact-reference cleanup.
  - Production symptom: accumulating handlers on window plus stale-closure logic.
  - Misconception: passing a similar arrow to remove works.
- _Skills: react, leaks, events. Difficulty: intermediate. ~12 min._

#### `ajr-l9-leaking-observers` - Leaking observers (IntersectionObserver/ResizeObserver)

- **Learn:** Observers not disconnected keep observing detached DOM and firing ghost callbacks.
- **See it live** (react-demo): runs an infinite-scroll sentinel with an observer, a live-observers badge, mounting/unmounting the list
  - Watch: the count growing and old sentinels firing extra page fetches (logged) without disconnect, staying at 1 with disconnect
- **Apply:** Add `return () => observer.disconnect()` to an infinite-scroll IntersectionObserver, and note the ResizeObserver undelivered-notifications pitfall.
- **Think about:**
  - What does the observer hold references to?
  - When must cleanup run besides unmount?
  - What if the ref is null on first run?
- **Model answer outline:**
  - Fix: disconnect()/unobserve() in cleanup, and re-run cleanup when the observed node changes; guard null refs.
  - Mechanism: the observer retains observed targets and the callback closure until disconnected.
  - Spot in review: new *Observer with no disconnect in cleanup, or observing ref.current in a [] effect.
  - Production symptom: infinite-scroll fires ghost fetches after unmount; memory retained.
  - Misconception: observers stop when the node unmounts.
- _Skills: react, leaks, observers. Difficulty: advanced. ~12 min._

### Module 9.2 - Retained Memory & Unmount

#### `ajr-l9-closure-retains-large-object` - Closures retaining large objects (heap growth)

- **Learn:** A live callback closing over a huge object pins the whole graph from GC.
- **See it live** (js-runnable): runs allocate a 10M-element typed array, capture the whole array in a retained closure vs only its length, report heap size (worker)
  - Watch: two bars, retained-high vs retained-low, proving the closure pins the object
- **Apply:** A handler closes over a 50MB dataset but only needs its length; show the whole array is retained and fix by capturing the derived primitive.
- **Think about:**
  - What does the closure keep reachable?
  - How do you confirm in DevTools?
  - How does useCallback extend object lifetime?
- **Model answer outline:**
  - Fix: capture the minimal derived value, or null out large locals before registering long-lived callbacks.
  - Mechanism: a closure keeps its whole lexical environment reachable.
  - Spot in review: long-lived listeners/memos closing over large props/datasets.
  - Production symptom: heap grows across mount/unmount; detached DOM pinned.
  - Misconception: only obviously-referenced variables are retained.
- _Skills: leaks, memory, closures. Difficulty: advanced. ~14 min._

#### `ajr-l9-setstate-after-unmount` - setState after unmount (the silent leak)

- **Learn:** React 18 removed the warning, so a late resolve is a silent wasted update masking a real leak.
- **See it live** (react-demo): runs clicking a row mounts a Detail that fetches with a 1500ms delay, Close unmounts it after 300ms
  - Watch: a badge/console showing "setState fired on unmounted instance" and a leak counter ticking, staying flat with the cleanup fix
- **Apply:** Add an ignore flag or AbortController to `useEffect(()=>{ fetch(url).then(setUser) }, [url])` so a late resolve is a no-op.
- **Think about:**
  - Why is there no warning anymore?
  - What is the real cost of the late setState?
  - Which fix also cancels the network work?
- **Model answer outline:**
  - Fix: prefer AbortController (cancels the request) over an ignore flag (only discards the result).
  - Mechanism: the promise closure retains the setter and component scope; the update is wasted and can mask a leak.
  - Spot in review: .then(setState) or await-before-setState in an effect with no cleanup.
  - Production symptom: retained memory and race/ordering bugs with no console signal.
  - Misconception: the removed warning means the leak is gone.
- _Skills: react, leaks, abort-controller. Difficulty: intermediate. ~12 min._

### Module 9.3 - Controlled Inputs

#### `ajr-l9-controlled-uncontrolled-switch` - Controlled to uncontrolled switch

- **Learn:** value starting undefined then becoming defined flips the input from uncontrolled to controlled.
- **See it live** (react-demo): runs an input whose value starts undefined and becomes "Ada" after a 1s fetch
  - Watch: a console warning banner lighting up and the caret glitching, clearing after value={user?.name ?? ""}
- **Apply:** Fix `<input value={user?.name} onChange={...} />` where user starts undefined, by defaulting to "" or gating render until data loads.
- **Think about:**
  - How does React decide controlled-ness each render?
  - What is the fix for numbers and checkboxes?
  - Why does value={undefined} equal uncontrolled?
- **Model answer outline:**
  - Fix: value={user?.name ?? ""}; pick controlled or uncontrolled for the fields lifetime.
  - Mechanism: React reads controlled-ness from whether value is null/undefined; a change in that decision warns and can reset the DOM value.
  - Spot in review: value={someState} where someState can be undefined/null.
  - Production symptom: a console warning plus caret/typing glitches after data loads.
  - Misconception: value={undefined} is a valid controlled value.
- _Skills: react, forms, controlled. Difficulty: intermediate. ~12 min._

#### `ajr-l9-value-onchange-trap` - The value/onChange trap and caret jump

- **Learn:** value without onChange freezes the input; reformatting on each keystroke jumps the caret to the end.
- **See it live** (react-demo): runs a frozen value-only input, then a currency formatter that jumps the caret, with a selection-preserving fix
  - Watch: an input you cannot type in until onChange is wired, and a caret jumping to the end on each keypress until selection is preserved
- **Apply:** Wire onChange to a frozen `<input value={state} />`, then fix a currency formatter that jumps the cursor by preserving selection or formatting on blur.
- **Think about:**
  - Why does value without onChange freeze the input?
  - What causes the caret jump?
  - Does React onChange map to input or change?
- **Model answer outline:**
  - Fix: add onChange; save/restore selectionStart or format on blur; use readOnly if freezing is intentional.
  - Mechanism: a controlled inputs DOM value is overwritten from state each render; reformatting changes length and moves the caret.
  - Spot in review: value= with no onChange (and no readOnly); setState that transforms e.target.value every keystroke.
  - Production symptom: an uneditable input, or the cursor leaping to the end while typing.
  - Misconception: React onChange fires on blur like the DOM change event (it fires on input).
- _Skills: react, forms, inputs. Difficulty: intermediate. ~12 min._

#### `ajr-l9-input-type-traps` - Input-type traps: checkbox, number, multi-select

- **Learn:** Each control has its own controlled contract; using value on a checkbox or a string for a number produces wrong data.
- **See it live** (react-demo): runs a form mixing a checkbox, a number input, and a multi-select with a live JSON state panel
  - Watch: wrong bindings showing agree:"on", age:"25"/NaN, multiselect stuck; correct bindings showing true, 25, an array
- **Apply:** Fix a form so a checkbox binds checked/e.target.checked, a number reads valueAsNumber (handling empty), and a multi-select stores an array.
- **Think about:**
  - What does e.target.value return for a checkbox and a number?
  - How do you read a multi-select?
  - How do you handle empty number input?
- **Model answer outline:**
  - Fix: checked + e.target.checked; e.target.valueAsNumber (guard NaN); [...selectedOptions].map(o=>o.value).
  - Mechanism: DOM value coercion differs per input type; checkbox value is the literal "on".
  - Spot in review: e.target.value on a checkbox, arithmetic on .value, single-string state for a multi-select.
  - Production symptom: booleans stored as "on", numbers as strings/NaN, multi-select capturing one value.
  - Misconception: number inputs give you numbers.
- _Skills: react, forms, inputs. Difficulty: intermediate. ~12 min._

### Module 9.4 - Events & Submit

#### `ajr-l9-synthetic-events-delegation` - Synthetic events: pooling myth, root delegation, portals

- **Learn:** Pooling/e.persist was removed in React 17; delegation moved to the root, changing portal/stopPropagation behavior.
- **See it live** (react-demo): runs an async handler reading e.target after a timeout (works now), and a Portal modal whose click bubbles to the logical React parent
  - Watch: the async read succeeding without e.persist, and a portal click bubbling through the React tree not the DOM tree
- **Apply:** Show that `setTimeout(()=>log(e.target))` no longer needs e.persist, then explain why stopPropagation inside a portal still bubbles to a React parent.
- **Think about:**
  - Is event pooling still a thing?
  - Where does React attach its listeners since v17?
  - How do portal events bubble?
- **Model answer outline:**
  - Fix: drop e.persist (obsolete); understand portal events bubble through the React tree, and mix native listeners carefully.
  - Mechanism: React 17+ delegates at the React root; synthetic events bubble by component tree, not DOM tree.
  - Spot in review: e.persist usage, or assuming stopPropagation crosses roots/portals/native listeners.
  - Production symptom: surprising propagation across portals and multiple React roots.
  - Misconception: React attaches events at document and pools synthetic events.
- _Skills: react, events, portals. Difficulty: advanced. ~12 min._

#### `ajr-l9-double-submit-idempotency` - Double-submit, re-entrancy, and idempotency

- **Learn:** A double-click or Enter+click creates two orders because the button was not disabled and the request not guarded.
- **See it live** (react-demo): runs a Buy button hitting a 1200ms endpoint, rapid double-clicked, naive vs pending-disable+ref vs idempotency-key
  - Watch: an order log showing 2 rows naive, 1 with the guard, and server dedup with an idempotency key
- **Apply:** Fix an async submit with no guard by disabling on pending, tracking an in-flight ref, and sending an idempotency key for server safety.
- **Think about:**
  - Why does a state flag not close the same-tick gap?
  - What entry points must the guard cover?
  - Why is server idempotency the durable fix?
- **Model answer outline:**
  - Fix: disable while pending + a synchronous ref lock, plus a server idempotency key.
  - Mechanism: setState is async, so a second synchronous click still sees the enabled state; a ref closes that gap.
  - Spot in review: an async mutating onSubmit/onClick with no disabled/pending guard and no idempotency.
  - Production symptom: double charges, duplicate orders, two emails.
  - Misconception: a client disabled button alone prevents double submit.
- _Skills: react, forms, idempotency. Difficulty: intermediate. ~12 min._

### Module 9.5 - Forms & Focus

#### `ajr-l9-form-actions-react19` - React 19 form Actions (useActionState/useFormStatus/useOptimistic)

- **Learn:** React 19 gives pending/error/reset and optimistic UI for free; teams still hand-roll them and misread auto-reset.
- **See it live** (react-demo): runs the same form manual (many useState) vs React 19 Actions side by side
  - Watch: the Actions version auto-disabling during submit, auto-resetting fields on success, and useOptimistic showing the new item instantly then reconciling
- **Apply:** Refactor a manual onSubmit with useState pending/error into `<form action={fn}>` + useActionState, plus a SubmitButton using useFormStatus().pending.
- **Think about:**
  - What does useActionState return?
  - Where must useFormStatus be called?
  - What does passing a function to form action do on success?
- **Model answer outline:**
  - Fix: useActionState(fn, initial) for [state, action, isPending]; a child SubmitButton reads useFormStatus().pending.
  - Mechanism: the action runs in a transition managing pending; passing a function auto-resets the form on success.
  - Spot in review: hand-rolled isLoading/error state around a submit, or useFormStatus in the same component as the form.
  - Production symptom (fixed): no stuck spinners or double-submits, and instant optimistic UI.
  - Misconception: <form action={fn}> keeps field values on success (it auto-resets).
- _Skills: react19, forms, actions. Difficulty: advanced. ~14 min._

#### `ajr-l9-focus-management-a11y` - Focus management and accessibility across lifecycle

- **Learn:** Conditional renders and modals destroy focus, stranding keyboard/screen-reader users.
- **See it live** (react-demo): runs keyboard-only navigation of a modal and a list where deleting the focused row loses focus, with a "focus is on" badge
  - Watch: focus falling to body (nothing highlighted) when broken, vs entering the modal, trapping, and returning to the trigger when fixed
- **Apply:** Fix a Modal to focus the first element on open, trap Tab, restore focus to the trigger on close, and add role/aria-modal/labelledby + Escape.
- **Think about:**
  - Where does focus go when the focused node unmounts?
  - What does a modal need for a11y?
  - How do you handle focus on route/page transitions?
- **Model answer outline:**
  - Fix: capture and restore document.activeElement, trap focus, aria-modal + role=dialog + labelled title, Escape to close.
  - Mechanism: the browser resets focus to body when the focused node unmounts; React does not restore it.
  - Spot in review: conditional interactive UI with no focus handling; modals without trap+restore.
  - Production symptom: keyboard and screen-reader users get stranded on body.
  - Misconception: autoFocus alone handles focus management.
- _Skills: react, a11y, focus. Difficulty: advanced. ~14 min._

---

## L10. TypeScript in Real React

_Type nuances that bite at runtime: discriminated unions, unknown vs any, guards, generics, and where casts hide crashes._

### Module 10.1 - UI State Types

#### `ajr-l10-discriminated-union-state` - Discriminated union for UI status

- **Learn:** A boolean bag lets impossible combos exist; a union on status collapses the state space to the legal set.
- **See it live** (react-demo): runs two panels driven by checkboxes for isLoading/error/data: a boolean bag vs a discriminated union
  - Watch: the boolean bag rendering spinner over error over stale data when all are ticked, while the union makes those combos unselectable
- **Apply:** Refactor `{ isLoading: boolean; error?: Error; data?: User }` into a discriminated union on status and render off status, and say what impossible state you eliminated.
- **Think about:**
  - How many states do n booleans allow vs how many are legal?
  - Why must the discriminant be a literal type?
  - What does the union do to data! assertions?
- **Model answer outline:**
  - Fix: {status:"idle"} | {status:"loading"} | {status:"error",error} | {status:"success",data}.
  - Mechanism: the union collapses 2^n states to the legal set; in success, data is guaranteed present.
  - Spot in review: multiple correlated optional booleans/fields on one state type.
  - Production symptom: components render impossible UI (spinner plus error plus stale data).
  - Misconception: types exist at runtime (the payoff is the bad render is unbuildable, not caught later).
- _Skills: typescript, discriminated-union, state. Difficulty: intermediate. ~14 min._

#### `ajr-l10-exhaustiveness-never` - Exhaustiveness checking with never

- **Learn:** assertNever on the discriminant makes a new variant a compile error instead of a silent blank UI.
- **See it live** (react-demo): runs a switch over status with an assertNever default, adding a new variant, vs a sibling switch without it
  - Watch: a red "not assignable to never" badge on the exhaustive switch when a variant is added, while the other silently renders nothing
- **Apply:** Add a `default: const _x: never = state` branch to a status switch, then add a fifth variant and predict the compile error; contrast a sibling switch without it.
- **Think about:**
  - How does TS narrow the union to never?
  - What defeats exhaustiveness (a missing return)?
  - Why is default: return null dangerous?
- **Model answer outline:**
  - Fix: assertNever in the default so every branch returns/throws and TS narrows to never.
  - Mechanism: once all variants are handled, the leftover is not assignable to never.
  - Spot in review: a default: return null with no never-check.
  - Production symptom: a new case ships a blank/default UI silently.
  - Misconception: a switch stays correct as the union grows without enforcement.
- _Skills: typescript, exhaustiveness, never. Difficulty: intermediate. ~12 min._

#### `ajr-l10-usestate-inference-traps` - useState inference traps

- **Learn:** Bare useState() or useState([]) infers uselessly wide/narrow types, so the setter accepts anything or nothing.
- **See it live** (react-demo): runs useState([]) then setItems([{id:1}]) erroring on never[], vs useState<Item[]>([]), with an inferred-type hover panel
  - Watch: the never[] setter rejecting real data (Dispatch<SetStateAction<never[]>>) vs the typed setter accepting it
- **Apply:** Fix `const [items,setItems]=useState([])` so setItems([{id:1}]) is allowed, and explain why useState(null) and useState("a") widen wrong.
- **Think about:**
  - What does TS infer for useState(), useState([]), useState(null)?
  - When do you pass the type argument?
  - What is the canonical null-initial pattern?
- **Model answer outline:**
  - Fix: useState<Item[]>([]); useState<User | null>(null) for null initials.
  - Mechanism: no initializer infers undefined; [] infers never[]; a primitive widens to its base type.
  - Spot in review: useState([]) / useState() / useState(null) with no generic.
  - Production symptom: a never[] state gets silenced with as any, reopening a runtime hole.
  - Misconception: inference always gives a useful type.
- _Skills: typescript, useState, inference. Difficulty: beginner. ~12 min._

### Module 10.2 - Trust Boundaries

#### `ajr-l10-unknown-vs-any` - unknown vs any at the trust boundary

- **Learn:** res.json()/JSON.parse are any, so unvalidated data flows in and TS stops checking.
- **See it live** (js-runnable): runs fetch/parse JSON where price is the string "12.30": cast to number and call toFixed vs validate with a schema (worker)
  - Watch: the cast path crashing with "price.toFixed is not a function", the validated path catching the mismatch cleanly
- **Apply:** Contrast `const u = await res.json() as User` with `const u: unknown = await res.json(); UserSchema.parse(u)`, and say why the cast is a lie.
- **Think about:**
  - What does any do that unknown does not?
  - What does as User actually enforce at runtime?
  - What makes external data truly match its type?
- **Model answer outline:**
  - Fix: type external data as unknown, then validate with Zod/valibot before use.
  - Mechanism: any disables checking and spreads; unknown forces a narrow; as is a compile-time promise unenforced at runtime.
  - Spot in review: as SomeType right after .json()/JSON.parse/localStorage.getItem.
  - Production symptom: x.toFixed is not a function crashes far from the boundary.
  - Misconception: any and unknown are interchangeable escape hatches.
- _Skills: typescript, unknown, validation. Difficulty: intermediate. ~14 min._

#### `ajr-l10-type-guards-unsound` - User-defined type guards are unsound

- **Learn:** A predicate x is T is trusted, not verified; a lazy guard is a silent lie.
- **See it live** (js-runnable): runs a shallow x is User guard checking only id, fed a malformed object, then calling .name.toUpperCase() (worker)
  - Watch: the guard returning true for a bad object and the code crashing on undefined, vs a thorough guard rejecting it
- **Apply:** Show `const isUser = (x:any): x is User => !!x && "id" in x` passing `{id:1}` (missing name) then crashing on user.name, and fix it.
- **Think about:**
  - Does TS verify the predicate body?
  - What does TS 5.5 auto-infer for some filters?
  - Why prefer schema-derived guards?
- **Model answer outline:**
  - Fix: check every field, or derive the guard from a schema (single source of truth).
  - Mechanism: the is predicate is asserted, not checked against the body.
  - Spot in review: a type predicate whose body is shorter than the type it claims to prove.
  - Production symptom: a missing field is dereferenced and crashes at runtime.
  - Misconception: a x is T guard is compiler-verified.
- _Skills: typescript, type-guards, validation. Difficulty: advanced. ~12 min._

#### `ajr-l10-as-casts-hide-bugs` - as assertions and double casts hide runtime bugs

- **Learn:** as overrides the compiler; as unknown as T bypasses even the overlap guard.
- **See it live** (js-runnable): runs querySelector(".btn") returns null, cast to HTMLButtonElement, call .click() (worker), plus an as-density counter
  - Watch: the cast crashing on null and each as unknown as flagged red, with the erased | null highlighted
- **Apply:** Replace `document.querySelector(".btn") as HTMLButtonElement` and `apiResp as unknown as User` with a guard or satisfies, and say what the cast erased.
- **Think about:**
  - What does as change: the type or the value?
  - What does as unknown as T defeat?
  - What null check did the cast erase?
- **Model answer outline:**
  - Fix: narrow with a guard or validate; use as only for verified DOM lookups, as const, and test mocks.
  - Mechanism: as changes only the static type; the runtime value is untouched, so the crash moves downstream.
  - Spot in review: as density, especially as unknown as at trust boundaries.
  - Production symptom: a cast that compiles then crashes far from the cast site.
  - Misconception: as is just a hint.
- _Skills: typescript, casts, safety. Difficulty: intermediate. ~12 min._

#### `ajr-l10-satisfies-operator` - satisfies vs as vs annotation

- **Learn:** satisfies validates a value without widening it, keeping literal keys for narrowing/autocomplete.
- **See it live** (react-demo): runs a config object typed with as vs satisfies vs annotation, with an inferred-type hover
  - Watch: as allowing a bogus key and losing autocomplete, satisfies erroring on the bad key while keeping exact key autocomplete
- **Apply:** Rewrite `const routes = {...} as Record<string,string>` with satisfies so bad keys error and exact keys autocomplete, and explain the difference.
- **Think about:**
  - What does satisfies keep that as/annotation lose?
  - When do you pair it with as const?
  - What does as on an object disable?
- **Model answer outline:**
  - Fix: const routes = {...} satisfies Record<string,string> (with as const for exact readonly configs).
  - Mechanism: satisfies checks the value against a type but keeps the value narrow inferred type.
  - Spot in review: as SomeType on an object literal you control (usually should be satisfies).
  - Production symptom (fixed): typo keys and missing keys caught, precise autocomplete kept.
  - Misconception: as validates like satisfies.
- _Skills: typescript, satisfies, config. Difficulty: intermediate. ~12 min._

### Module 10.3 - Generics in Components

#### `ajr-l10-generic-components` - Generic components and the tsx arrow gotcha

- **Learn:** A generic List infers its item type from props; the <T> arrow syntax collides with JSX.
- **See it live** (react-demo): runs a generic <List items={users} render={u => u.name} /> with a type hover, swapping items to products
  - Watch: u inferred as User (hover), then u.name erroring when items are products, plus the <T,> trailing-comma fix for arrow generics
- **Apply:** Write `function List<T>({items, render})` so the item type flows into render, and show why an arrow generic needs `<T,>` in .tsx.
- **Think about:**
  - How does TS infer the type parameter?
  - Why does <T> break in .tsx?
  - How do you constrain the param?
- **Model answer outline:**
  - Fix: infer T from items; use <T,> or <T extends unknown> for arrow generics; constrain with <T extends {id:string}>.
  - Mechanism: TS infers T at the call site and threads it through the render prop.
  - Spot in review: a reusable list/table/select typed with any[]/unknown[] props.
  - Production symptom (fixed): item-type safety in the render callback.
  - Misconception: generic components must be typed with any[] to compile in .tsx.
- _Skills: typescript, generics, components. Difficulty: advanced. ~14 min._

#### `ajr-l10-forwardref-memo-generics` - forwardRef/memo drop generics (React 19 fixes it)

- **Learn:** Wrapping a generic component in forwardRef/memo collapses its type param to unknown.
- **See it live** (react-demo): runs a generic Select wrapped in forwardRef (React 18) vs ref-as-prop (React 19), with a type hover
  - Watch: onSelect item inferred as unknown in the forwardRef tab vs User in the ref-as-prop tab
- **Apply:** A generic Select<T> wrapped in forwardRef infers T=unknown; contrast the React 19 fix (drop forwardRef, take ref as a prop).
- **Think about:**
  - Why does higher-order inference fail on forwardRef?
  - What are the pre-19 workarounds?
  - What changed in React 19?
- **Model answer outline:**
  - Fix: React 19, take ref as an ordinary prop on a plain generic function component so inference survives.
  - Mechanism: TS higher-order inference needs a single call signature; forwardRef/memo add members so T defaults to unknown.
  - Spot in review: a generic component behind forwardRef/memo whose consumers all cast.
  - Production symptom: a generic Select loses item-type safety exactly where library authors need it.
  - Misconception: forwardRef preserves generics.
- _Skills: typescript, generics, react19. Difficulty: advanced. ~14 min._

#### `ajr-l10-generic-hooks-tuples` - Generic hooks and tuple-return inference

- **Learn:** A hook returning [value, setValue] infers a widened union array unless you annotate a tuple or use as const.
- **See it live** (react-demo): runs a useToggle hook returning [on, toggle] without vs with a tuple return type, with a type hover
  - Watch: the destructured toggle inferred as boolean | (()=>void) (calling it errors) until the tuple type/as const fixes it
- **Apply:** Fix `useToggle` whose `[on, toggle]` infers `(boolean | (()=>void))[]`, using an explicit tuple return type or as const.
- **Think about:**
  - Why does a mixed array literal widen?
  - How does as const help?
  - How do you thread a generic through a custom hook setter?
- **Model answer outline:**
  - Fix: annotate the return as [boolean, () => void] or return [on, toggle] as const.
  - Mechanism: an array literal of mixed types infers a union array, dropping per-position types.
  - Spot in review: consumers of a custom hook casting or getting union types off destructured returns.
  - Production symptom: calling the setter errors or needs a cast.
  - Misconception: tuple positions are inferred automatically.
- _Skills: typescript, generics, hooks. Difficulty: intermediate. ~12 min._

### Module 10.4 - Typing the Surface

#### `ajr-l10-typing-children` - Typing children: ReactNode vs JSX.Element

- **Learn:** children: JSX.Element rejects strings/arrays/null and function-children.
- **See it live** (react-demo): runs a Card typed with JSX.Element rejecting text/number/fragment/conditional, then switched to ReactNode
  - Watch: red errors on each child shape with JSX.Element, all passing with ReactNode, plus a render-prop children example
- **Apply:** Fix a Card typed `children: JSX.Element` that breaks on `<Card>hello {cond && <X/>}</Card>`, and add a render-prop children type.
- **Think about:**
  - What is ReactNode vs JSX.Element/ReactElement?
  - When do you want a single element type?
  - What does PropsWithChildren give?
- **Model answer outline:**
  - Fix: children: ReactNode for wrappers; ReactElement/JSX.Element only when you need one element.
  - Mechanism: ReactNode is the broad renderable union; JSX.Element is a single element object.
  - Spot in review: children: JSX.Element (singular) on a wrapper component.
  - Production symptom (fixed): consumers stop casting or wrapping content in fragments.
  - Misconception: JSX.Element is the right type for children.
- _Skills: typescript, children, props. Difficulty: beginner. ~10 min._

#### `ajr-l10-polymorphic-as-prop` - Polymorphic as-prop components

- **Learn:** A Box with an as prop must accept the right attrs per element and forward the right ref type.
- **See it live** (react-demo): runs a Box with an as dropdown (div/a/button), passing href and disabled
  - Watch: href erroring until as="a", disabled validating only on button, and ref resolving to the correct element per as
- **Apply:** Type a `<Box as>` with ComponentPropsWithoutRef<E> so `<Box as="a" href=...>` is valid but `<Box as="div" href=...>` errors.
- **Think about:**
  - How do you pull the intrinsic props of the chosen tag?
  - How do you forward the correct ref type?
  - What is the compile-time/DX cost?
- **Model answer outline:**
  - Fix: <E extends ElementType> + Omit<ComponentPropsWithoutRef<E>, "as"|"children"> + ComponentPropsWithRef for the ref.
  - Mechanism: the generic pulls per-tag props from the chosen element type.
  - Spot in review: an as prop typed as keyof JSX.IntrinsicElements with props typed any.
  - Production symptom (fixed): invalid props per element are caught and refs match.
  - Misconception: a single any-typed props works for polymorphic components.
- _Skills: typescript, polymorphic, props. Difficulty: advanced. ~14 min._

#### `ajr-l10-event-handler-inference` - Extracted event handlers lose inference

- **Learn:** Inline onChange infers e; pulling it into a named function without typing e makes it any.
- **See it live** (react-demo): runs two inputs: an inline handler (e inferred) vs an extracted un-typed handler, with a type hover
  - Watch: e hovering as ChangeEvent<HTMLInputElement> inline vs any when extracted, where a typo like e.target.valeu goes uncaught
- **Apply:** Fix an extracted `function handleChange(e){ setV(e.target.value) }` where e is implicitly any, by typing `e: React.ChangeEvent<HTMLInputElement>`.
- **Think about:**
  - Why does inline infer e but extraction not?
  - Which event/element types do you use?
  - Why is e.currentTarget more reliably typed?
- **Model answer outline:**
  - Fix: annotate the param (React.ChangeEvent<HTMLInputElement>, MouseEvent, FormEvent).
  - Mechanism: contextual typing only works when the callback is inline at the JSX prop.
  - Spot in review: named handler functions with an un-annotated event param.
  - Production symptom: typos on e.target uncaught; value silently undefined.
  - Misconception: extracted handlers keep their inferred event type.
- _Skills: typescript, events, inference. Difficulty: intermediate. ~10 min._

#### `ajr-l10-useref-types-react19` - useRef types in React 19 (required arg, cleanup)

- **Learn:** React 19 requires a useRef arg, ref callbacks may return cleanup, and mutable vs readonly overloads differ.
- **See it live** (react-demo): runs an input with a ref-callback that subscribes a ResizeObserver and returns cleanup, beside useRef() erroring
  - Watch: an attach/cleanup log firing on mount/unmount and the useRef() no-arg TS error, plus the readonly-vs-mutable overload difference
- **Apply:** Show `useRef<HTMLInputElement>(null)` (arg now required), a ref-as-prop type, and a ref callback returning a cleanup; contrast readonly vs mutable ref overloads.
- **Think about:**
  - Why is .current null before mount?
  - What does a ref callback returning cleanup change?
  - When do you want the mutable overload?
- **Model answer outline:**
  - Fix: useRef<T>(null); type ref?: React.Ref<T> in props; return a cleanup from ref callbacks; use useRef<T|null> for mutable values.
  - Mechanism: React 19 passes ref as a prop; the required arg and cleanup-returning callbacks are new type rules.
  - Spot in review: leftover forwardRef wrappers and useRef() with no initial value, or ref.current! in render.
  - Production symptom (fixed): correct teardown and no null-before-mount crashes.
  - Misconception: .current is always non-null.
- _Skills: typescript, refs, react19. Difficulty: advanced. ~12 min._

### Module 10.5 - Strictness Flags

#### `ajr-l10-nouncheckedindexedaccess` - noUncheckedIndexedAccess: arr[i] is T | undefined

- **Learn:** By default indexed access is typed as present even out of range, so .map on undefined crashes despite green types.
- **See it live** (js-runnable): runs arr[5].name on a 3-element array (worker), with a strict-index badge simulating the flag
  - Watch: the crash on undefined, then the flag flagging the access and the guard removing it
- **Apply:** Enable the flag conceptually and fix `const first = users[0]; first.name` and `dict[key].trim()` with guards.
- **Think about:**
  - What does the flag add to indexed reads?
  - What does it catch (arrays, tuples, Record)?
  - Why is silencing it with ! an anti-pattern?
- **Model answer outline:**
  - Fix: guard with destructuring/.at()/optional chaining before use.
  - Mechanism: the flag adds | undefined to array/Record index reads that TS otherwise assumes present.
  - Spot in review: arr[i].x / map[key].y with no existence check.
  - Production symptom: out-of-range/missing-key crashes on empty or partial data.
  - Misconception: arr[i] is always present.
- _Skills: typescript, strictness, safety. Difficulty: intermediate. ~12 min._

#### `ajr-l10-object-keys-string` - Object.keys returns string[], not keyof

- **Learn:** keys are widened to string by design; casting as keyof T is unsound when runtime objects have extra keys.
- **See it live** (js-runnable): runs an object with an extra runtime key not in its type, iterated with as (keyof T)[] then indexed (worker)
  - Watch: the extra key flowing through as a declared type and crashing downstream, illustrating why keys are widened
- **Apply:** Show `Object.keys(user).forEach(k => user[k as keyof User])` and why the cast is unsound; contrast a typed helper or a validated shape.
- **Think about:**
  - Why can TS not narrow keys to keyof?
  - What is structural (open) typing?
  - When is the cast actually unsafe?
- **Model answer outline:**
  - Fix: iterate a known literal key list, or validate the object shape first.
  - Mechanism: objects can have MORE keys than their type, so keys cannot be soundly narrowed to keyof.
  - Spot in review: as keyof around Object.keys loops over API-sourced objects.
  - Production symptom: an unexpected runtime key flows through and crashes later.
  - Misconception: Object.keys should return keyof T.
- _Skills: typescript, strictness, keyof. Difficulty: advanced. ~12 min._

#### `ajr-l10-narrowing-loss-await` - Narrowing loss across await and callbacks

- **Learn:** TS discards property narrowing after await because the object could have mutated.
- **See it live** (react-demo): runs if(ref.current){ await fetch(); ref.current.value } where the component unmounts mid-await
  - Watch: the null re-read after await crashing, then hoisting to a const capturing the value and avoiding it
- **Apply:** Fix `if (state.data) { await save(); render(state.data.name) }` that loses narrowing after await, by hoisting to a const.
- **Think about:**
  - Why is property narrowing discarded across await?
  - Does local const narrowing survive?
  - Why is this legitimate for refs?
- **Model answer outline:**
  - Fix: const data = state.data; if (data) { await ...; data.name }.
  - Mechanism: control-flow narrowing is discarded when a mutation could have happened (await/callback/reassignment).
  - Spot in review: x.y.z used after an await where x.y was checked earlier.
  - Production symptom: a null re-read after await crashes (ref.current became null on unmount).
  - Misconception: narrowing survives an await.
- _Skills: typescript, narrowing, async. Difficulty: advanced. ~12 min._

### Module 10.6 - Real-World Types

#### `ajr-l10-usereducer-action-union` - Typing useReducer with a discriminated action union

- **Learn:** String-typed actions with any payloads let dispatch send the wrong payload.
- **See it live** (react-demo): runs a reducer-driven todo list where dispatch({type:"remove"}) without id errors, with a case-narrowing hover
  - Watch: dispatching a bad payload showing a red error, and after case "add" the reducer exposing action.item but not action.id, plus assertNever on a new action
- **Apply:** Type `type Action = {type:"add",item} | {type:"remove",id}` and a reducer switching on action.type with exhaustiveness, and show dispatch autocompleting the right payload.
- **Think about:**
  - How does action.type narrow the action inside a case?
  - What does typing the reducer return catch?
  - Why prefer this over payload: any?
- **Model answer outline:**
  - Fix: a discriminated Action union; type the reducer return as State; assertNever in default.
  - Mechanism: the type literal narrows the union inside each case, exposing only that variant payload.
  - Spot in review: payload: any on actions, or a reducer with no default/never check.
  - Production symptom: reducers read undefined fields and state corrupts.
  - Misconception: {type:string; payload:any} is good enough.
- _Skills: typescript, useReducer, discriminated-union. Difficulty: intermediate. ~12 min._

#### `ajr-l10-context-typing-guard-hook` - Context typing: createContext null + guard hook

- **Learn:** createContext({} as T) lies about a real null default; a guard hook makes misuse a clear error.
- **See it live** (react-demo): runs a component using useAuth outside its provider, {} as AuthCtx default vs null + guard hook
  - Watch: version A crashing deep on auth.user.name, version B throwing a clear "useAuth must be used within AuthProvider"
- **Apply:** Type `createContext<AuthCtx | null>(null)` and a useAuth hook that throws if null and returns a non-null type.
- **Think about:**
  - Why is {} as T a runtime lie?
  - What does the guard hook narrow?
  - Where do you pair this with a discriminated union?
- **Model answer outline:**
  - Fix: default the context to null and throw in a guard hook, returning a non-null value to consumers.
  - Mechanism: the null default plus a guard makes out-of-provider use a loud early error.
  - Spot in review: createContext(... as SomeType) or optional-everything context types.
  - Production symptom: a deep crash instead of a clear provider error.
  - Misconception: defaulting context to {} as T is fine.
- _Skills: typescript, context, patterns. Difficulty: intermediate. ~12 min._

#### `ajr-l10-excess-property-checks` - Structural typing and excess-property checks

- **Learn:** TS only flags extra props on fresh literals; spread through a variable and typos pass silently.
- **See it live** (react-demo): runs a Button reading color, passed colour inline (errors) vs via a spread variable (compiles, no color)
  - Watch: the inline typo erroring, the spread-variable typo compiling and the button staying default-colored (bug ships)
- **Apply:** Show `<Button colour="red" />` erroring inline but `const p={colour:"red"}; <Button {...p} />` compiling and never applying, and explain the fresh-literal rule.
- **Think about:**
  - When do excess-property checks fire?
  - Why does spreading a variable turn them off?
  - How do you reduce the blind spot?
- **Model answer outline:**
  - Fix: pass props inline where possible, or use satisfies/exact helpers to catch extras.
  - Mechanism: excess-property checks only fire on fresh object literals; structural typing drops extras through variables.
  - Spot in review: props passed via spread/variable, especially near renamed props.
  - Production symptom: a mistyped prop is silently ignored at runtime.
  - Misconception: TS catches extra props everywhere.
- _Skills: typescript, structural-typing, props. Difficulty: intermediate. ~10 min._

---

## L11. Production-Grade React & Architecture

_RSC boundaries, hydration, streaming, tearing, state architecture, race-safe mutations, and testing the nuances._

### Module 11.1 - RSC & the Serialization Boundary

#### `ajr-l11-use-client-serialization` - The "use client" boundary is a serialization seam

- **Learn:** Passing a function/Date/class/Map from a Server to a Client Component throws; only serializable props cross.
- **See it live** (react-demo): runs a toggle flipping a prop between serializable (plain object) and non-serializable (function/Date/Map) across a boundary
  - Watch: the boundary lighting green/red with the exact React serialization error and a panel showing what actually crosses the wire
- **Apply:** Rewrite a Server Component rendering `<Chart data={new Map(...)} onPick={fn} createdAt={new Date()} />` to pass only serializable props and move behavior behind a Server Action or into the client.
- **Think about:**
  - What can cross the RSC wire?
  - What does "use client" actually mark?
  - What is the donut/children pattern?
- **Model answer outline:**
  - Fix: pass plain objects/ISO strings; use a Server Action for behavior; pass server children into a client shell.
  - Mechanism: the RSC renderer serializes the tree via Flight; functions/class instances/Dates/Maps have no wire representation.
  - Spot in review: a client component importing a server-only module, or non-plain props crossing the boundary.
  - Production symptom: a prod build error "Props must be serializable" breaking the page.
  - Misconception: "use client" means the component runs only in the browser (it still SSRs).
- _Skills: rsc, serialization, nextjs. Difficulty: advanced. ~14 min._

#### `ajr-l11-server-vs-client-components` - Server vs Client Components: where code runs

- **Learn:** Server Components cannot use state/effects/browser APIs; over-marking "use client" bloats the bundle.
- **See it live** (react-demo): runs a component tree colored server vs client with a bundle-size meter, dragging "use client" up and down
  - Watch: the bundle meter and "server-only APIs available" badge updating as the boundary moves, showing giant client tree vs small islands
- **Apply:** Split a component that mixes a DB fetch, an interactive counter, and window.matchMedia into a server shell plus a client island.
- **Think about:**
  - What can a server component do that a client one cannot?
  - What inflates the client bundle?
  - Where should "use client" live?
- **Model answer outline:**
  - Fix: fetch/layout on the server; push interactivity into small "use client" leaves.
  - Mechanism: Server Components render once and never hydrate; Client Components render on server (SSR) and client.
  - Spot in review: a top-level layout marked "use client".
  - Production symptom: the whole subtree ships as client JS and loses the RSC benefit.
  - Misconception: you can freely use hooks in a component without "use client".
- _Skills: rsc, architecture, nextjs. Difficulty: advanced. ~12 min._

#### `ajr-l11-server-actions-security` - Server Actions are public POST endpoints

- **Learn:** A Server Action is a network-exposed endpoint; closure vars are serialized to the client and back.
- **See it live** (react-demo): runs a form calling a Server Action with a network panel showing the encoded action id + serialized bound args, and a replay button
  - Watch: the closure values visible on the wire and a replayed POST running without the UI, proving server-side auth is mandatory
- **Apply:** Fix a `deletePost` Server Action that trusts a captured userId and does no auth check, by re-authenticating from the session, validating with Zod, and adding idempotency.
- **Think about:**
  - Can the action be invoked without the UI?
  - What happens to captured closure variables?
  - Where must authorization live?
- **Model answer outline:**
  - Fix: re-read the session and re-authorize inside the action, validate inputs, make destructive actions idempotent.
  - Mechanism: an action compiles to a stable endpoint id the client can invoke directly; bound closure args are serialized both ways.
  - Spot in review: a mutating Server Action with no session re-check or input validation.
  - Production symptom: anyone can POST the endpoint to delete/charge/leak data.
  - Misconception: a Server Action is a trusted local function.
- _Skills: rsc, server-actions, security. Difficulty: advanced. ~16 min._

### Module 11.2 - Hydration & Streaming

#### `ajr-l11-hydration-mismatch` - Hydration mismatch from non-deterministic render

- **Learn:** new Date()/Math.random()/localStorage in render makes server HTML differ from client and gets thrown away.
- **See it live** (react-demo): runs the same component rendered "on server" and "on client" side by side with a diff highlighter
  - Watch: the mismatched text node flashing red and a counter showing React discarded the server HTML, cleared by the two-pass fix
- **Apply:** Fix a component rendering `{new Date().toLocaleTimeString()}` and `localStorage.getItem("theme")` in JSX, by making the first render deterministic or passing the value from the server.
- **Think about:**
  - Why must the first client render match the server HTML?
  - What is the two-pass useEffect fix?
  - When is suppressHydrationWarning appropriate?
- **Model answer outline:**
  - Fix: render a stable placeholder then set the real value in useEffect, or send it from the server (cookies/headers).
  - Mechanism: a mismatch makes React discard the server tree and client-render that boundary (flash, lost SSR).
  - Spot in review: Date/random/window/localStorage referenced in a component body.
  - Production symptom: a content flash and a hydration error in the console.
  - Misconception: suppressHydrationWarning fixes structural mismatches.
- _Skills: react, hydration, ssr. Difficulty: advanced. ~14 min._

#### `ajr-l11-streaming-ssr-suspense` - Streaming SSR and Suspense boundaries

- **Learn:** A missing/misplaced Suspense boundary blocks the whole stream on the slowest fetch.
- **See it live** (react-demo): runs a timeline visualizer of a streamed response where chunks flush as data resolves, toggling "wrap slow widget in Suspense"
  - Watch: the shell painting at 50ms with skeletons instead of blocking to 2000ms, and an error boundary isolating a failing widget
- **Apply:** Wrap slow sections of a dashboard in Suspense with skeletons and add error boundaries so one slow/failed widget does not stall or crash the rest.
- **Think about:**
  - What does Suspense let React flush first?
  - What happens with no boundary around slow data?
  - Why pair each async boundary with an error boundary?
- **Model answer outline:**
  - Fix: per-section Suspense with skeletons and a co-located error boundary.
  - Mechanism: React streams the shell immediately and streams slow subtrees later, each with its own fallback.
  - Spot in review: a slow fetch with no Suspense boundary, or a boundary with no error handling.
  - Production symptom: a fast page blocked to a blank wait on the slowest fetch.
  - Misconception: SSR is all-or-nothing.
- _Skills: react, streaming, suspense. Difficulty: advanced. ~14 min._

### Module 11.3 - Concurrency in Production

#### `ajr-l11-tearing-sync-external-store` - Concurrent tearing and useSyncExternalStore

- **Learn:** An external store mutating mid-render makes components read different values (tearing).
- **See it live** (react-demo): runs a hand-rolled store subscribed via useState+useEffect that tears under useTransition vs useSyncExternalStore
  - Watch: rows rendering mismatched values (41 and 42) with the naive subscription, all consistent with useSyncExternalStore
- **Apply:** Rewrite a store subscribed via useState+useEffect that tears under a transition, using useSyncExternalStore (getSnapshot + getServerSnapshot).
- **Think about:**
  - What is tearing?
  - Why are useState/useContext tear-safe but raw subscriptions not?
  - What does getSnapshot force?
- **Model answer outline:**
  - Fix: subscribe with useSyncExternalStore for a consistent synchronous read; provide getServerSnapshot for SSR.
  - Mechanism: concurrent React can pause/resume a render; a changing external source is read inconsistently across it.
  - Spot in review: subscribing to an external store with useEffect+useState.
  - Production symptom: two parts of the tree show different values of the same data.
  - Misconception: a manual store subscription is safe under concurrent rendering.
- _Skills: react, tearing, useSyncExternalStore. Difficulty: advanced. ~14 min._

#### `ajr-l11-automatic-batching` - Automatic batching (and when it does not apply)

- **Learn:** React 18/19 batches setStates in promises/timeouts/native handlers into one render.
- **See it live** (react-demo): runs three setStates inside setTimeout/promise with a render-count badge and a flushSync toggle
  - Watch: the badge incrementing once (batched) where a pre-18 model expects three, and jumping per call with flushSync
- **Apply:** Predict how many renders three setStates inside a fetch .then cause under React 18/19, and identify the rare case that needs flushSync.
- **Think about:**
  - What did React 18 batching change?
  - Can you rely on read-after-set within a handler?
  - When do you need flushSync?
- **Model answer outline:**
  - Fix: use functional updaters when next depends on previous; use flushSync only to measure the DOM between updates.
  - Mechanism: React 18+ batches all updates by default; components see the final state for the tick.
  - Spot in review: assuming multiple setStates cause multiple renders, or overusing flushSync.
  - Production symptom: reliance on intermediate states that never render, or flushSync-induced jank.
  - Misconception: setStates in a promise/timeout each cause a render.
- _Skills: react, batching, flushsync. Difficulty: intermediate. ~12 min._

### Module 11.4 - State Architecture

#### `ajr-l11-server-vs-client-state` - Server state is not client state

- **Learn:** Server data (fetched, cached, revalidated, shared) belongs in a query cache, not Redux/Context.
- **See it live** (react-demo): runs two panels rendering the same list: useState+useEffect (manual flags, no dedupe) vs a query cache, with a request counter
  - Watch: the left panel double-fetching and going stale while the right dedupes and background-revalidates
- **Apply:** Replace the server-data portion of a component managing a fetched list with useState + manual loading/refetch by React Query/SWR (or RSC), keeping only real UI state local.
- **Think about:**
  - How do you classify a piece of state?
  - What does a query cache give you for free?
  - What does over-centralizing cause?
- **Model answer outline:**
  - Fix: server state in a query cache/RSC; UI state local; global client state in a store; URL state in the URL.
  - Mechanism: server state is a cached copy of remote data needing revalidation, dedupe, and GC.
  - Spot in review: fetched data in Redux/Context with hand-rolled caching.
  - Production symptom: stale duplicated data, refetch storms, and re-render storms.
  - Misconception: all shared state belongs in one global store.
- _Skills: react, state-management, architecture. Difficulty: intermediate. ~12 min._

#### `ajr-l11-caching-revalidation-nextjs` - Next.js App Router caching and revalidation

- **Learn:** App Router caches across multiple layers; stale data or accidental dynamic rendering ships without explicit intent.
- **See it live** (react-demo): runs a request flowing through the cache layers (Request Memoization -> Data Cache -> Full Route -> Router Cache) with toggles and a data-age badge, plus a mutation revalidating one layer
  - Watch: which cache served the stale value, and revalidateTag busting exactly one layer after a write
- **Apply:** A page shows stale data because it was statically cached; make the caching intent explicit (tags/cacheLife or force dynamic) and wire revalidateTag in the mutating action.
- **Think about:**
  - Which cache layer usually serves stale data?
  - How did caching defaults change across Next 14/15/16?
  - What makes a route accidentally dynamic?
- **Model answer outline:**
  - Fix: make caching explicit with tags/cacheLife, and revalidateTag/revalidatePath after a write.
  - Mechanism: App Router layers request memoization, Data Cache, Full Route Cache, and Router Cache.
  - Spot in review: a mutation that never revalidates, or a fetch whose caching intent is implicit.
  - Production symptom: stale reads after writes, or accidental dynamic rendering killing static perf.
  - Misconception: fetch caching defaults are stable across Next versions.
- _Skills: nextjs, caching, revalidation. Difficulty: advanced. ~14 min._

### Module 11.5 - Reliability & Testing

#### `ajr-l11-error-boundaries-limits` - Error boundaries do not catch async or event errors

- **Learn:** Boundaries catch render/lifecycle errors of descendants, not promises, timers, or event handlers.
- **See it live** (react-demo): runs three buttons: throw in render (caught), throw in event handler (uncaught), throw in async .then (uncaught), then the funnel fix
  - Watch: a status panel labeling which errors the boundary sees, and the async error surfaced into render so the boundary catches it
- **Apply:** Wrap a component whose onClick and whose fetch().then both throw in an ErrorBoundary, show neither is caught, then route async errors into React and add a reset.
- **Think about:**
  - What does an error boundary actually catch?
  - How do you surface an async/handler error to a boundary?
  - How do you let users recover?
- **Model answer outline:**
  - Fix: put the error in state and throw during render (or use a query lib error state); provide resetKeys/a retry.
  - Mechanism: boundaries rely on render-phase try/catch; async work already escaped the render stack.
  - Spot in review: an ErrorBoundary expected to catch event-handler or promise errors.
  - Production symptom: async/handler errors crash or vanish silently past the boundary.
  - Misconception: an error boundary catches everything below it.
- _Skills: react, error-boundaries, reliability. Difficulty: advanced. ~14 min._

#### `ajr-l11-race-safe-mutations` - Race-safe mutations: retries and idempotency on the client

- **Learn:** Retried or concurrent mutations double-write without idempotency; optimistic UI needs reconciliation.
- **See it live** (react-demo): runs a like/submit with a flaky server and retry, naive vs idempotency-key, with client-attempts and server-applied counters
  - Watch: client attempts climbing while server-applied stays at 1, and optimistic UI reconciling to server truth on settle
- **Apply:** Make a mutation race-safe under retries and rapid toggles with a stable idempotency key and reconciliation to the server value, and explain useOptimistic silent-persist.
- **Think about:**
  - What does a stable idempotency key guarantee?
  - When must the last server-confirmed value win?
  - When does useOptimistic fail to revert?
- **Model answer outline:**
  - Fix: a stable per-intent idempotency key, server-side dedup, and reconcile optimistic state to the server response.
  - Mechanism: useOptimistic reverts only when the canonical state reference changes; a silent no-op strands the guess.
  - Spot in review: a retried mutation with no dedupe key, or optimistic setState with no rollback path.
  - Production symptom: duplicate writes and a phantom optimistic value that sticks.
  - Misconception: a client guard alone prevents double-writes.
- _Skills: react, races, idempotency. Difficulty: advanced. ~14 min._

#### `ajr-l11-testing-async-races` - Testing async effects, races, and act() warnings

- **Learn:** Async tests are flaky without awaiting state settling; act() warnings signal state updated after the test moved on.
- **See it live** (js-runnable): runs run the same async test 50 times: a naive synchronous-assert version vs findBy/waitFor + MSW
  - Watch: a flaky bar chart (~30/50 pass) for the naive version vs 50/50 for the waitFor+MSW version, plus an act() warning firing on a late setState
- **Apply:** Rewrite a flaky test that asserts immediately after render, using findBy/waitFor and MSW, and add a test for the stale-response race (resolve id=2 before id=1).
- **Think about:**
  - What is the #1 cause of flaky async tests?
  - What does act() ensure?
  - How do you force a race ordering in a test?
- **Model answer outline:**
  - Fix: await findBy/waitFor, mock the network with MSW, and use fake timers to control race ordering.
  - Mechanism: querying before state settles fails intermittently; act() flushes updates/effects before assertions.
  - Spot in review: synchronous getBy assertions right after render on async UI.
  - Production symptom: flaky CI and untested race/rollback paths shipping bugs.
  - Misconception: a single pass means the async test is reliable.
- _Skills: testing, async, races. Difficulty: advanced. ~14 min._

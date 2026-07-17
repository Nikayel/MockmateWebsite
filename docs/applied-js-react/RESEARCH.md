# Applied JavaScript & React — research foundation

> Part of the **[Applied JS & React curriculum pack](./README.md)**. Connected files: [README](./README.md) · [ARCHITECTURE](./ARCHITECTURE.md) · [CURRICULUM-MAP](./CURRICULUM-MAP.md) · [curriculum-map.json](./curriculum-map.json) · [CONTENT](./CONTENT.md) · [RESEARCH](./RESEARCH.md) · [AGENT-1](./AGENT-1-engineer.md) · [AGENT-2](./AGENT-2-curriculum-developer.md)
>
> This is the web-grounded research that shaped the course:
> the thesis, the full nuance taxonomy, the canonical buggy code and the live demos that make each nuance
> visible, the 2024-2026 platform additions (React 19, the React Compiler, RSC/App Router, Suspense), and the
> misconceptions the course is built to dislodge.

The premise of this course is that **syntax is cheap and nuance-you-must-SEE is the moat.** Anyone can learn what
`useEffect`, `await`, or the spread operator *do* in an afternoon; the tutorials, the docs, and now the models all
teach that fluently. What separates a mid engineer from a senior one is not knowing the API — it is having a
correct mental model of the *machine underneath the API*: the single-threaded event loop that runs your handler
to completion before it can paint, the closure that captures a live binding rather than a snapshot, the
`Object.is` reference check that silently swallows an in-place mutation, the render that React can start, throw
away, and restart. None of that is visible in the source text. It only shows up as a bug — usually in production,
usually intermittently, usually on someone else's machine. **The entire pedagogy of this course is to make the
invisible mechanism visible**: every gotcha ships with a canonical "why is this broken" snippet the learner
predicts the output of, *and* a live, runnable demo — an animated event-loop visualizer, a render-count badge, a
reference-identity table, a timing-bar race — that turns the abstract mechanism into something you watch happen.
You do not understand the microtask queue because someone told you microtasks drain before the next task; you
understand it because you watched `C` and `D` empty the queue before `B` ever ran.

The material is grounded in the reference canon the field actually draws on: the [react.dev](https://react.dev)
learn guides (especially *You Might Not Need an Effect*, *Synchronizing with Effects*, *Removing Effect
Dependencies*, *Render and Commit*, *Queueing a Series of State Updates*, and the *Rules of React*); the
[MDN Web Docs](https://developer.mozilla.org/) reference for the event loop, Promises, `AbortController`, and
`structuredClone`; the [WHATWG HTML event-loop processing model](https://html.spec.whatwg.org/multipage/webappapis.html#event-loops)
and timer-clamping spec; Jake Archibald's ["In The Loop"](https://www.youtube.com/watch?v=cCOL7MC4Pl0) and
["Tasks, microtasks, queues and schedules"](https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules/);
the V8 team's ["Faster async functions and promises"](https://v8.dev/blog/fast-async) (the `await`-tick
optimization); [web.dev](https://web.dev/) on **INP**, long tasks, and `scheduler.yield()`; Dan Abramov's
["A Complete Guide to useEffect"](https://overreacted.io/a-complete-guide-to-useeffect/) and
["Making setInterval Declarative with React Hooks"](https://overreacted.io/making-setinterval-declarative-with-react-hooks/);
Kent C. Dodds on [state colocation](https://kentcdodds.com/blog/state-colocation-will-make-your-react-app-faster)
and [fixing the slow render before the re-render](https://kentcdodds.com/blog/fix-the-slow-render-before-you-fix-the-re-render);
the [React 19 release notes](https://react.dev/blog/2024/12/05/react-19) and the
[React Compiler docs](https://react.dev/learn/react-compiler); the [Next.js App Router docs](https://nextjs.org/docs/app)
(caching, Server Actions, streaming); and the [TanStack Query docs](https://tanstack.com/query/latest). Sources
are cited inline and consolidated at the close.

Twelve briefs follow, one per competency band — a spine that climbs from the language runtime up through
production React architecture:

1. **The JS runtime & event loop (L0)** — run-to-completion, the task/microtask ordering law, what `async/await` desugars to, blocking the main thread, INP.
2. **Closures, scope, references & identity (L1)** — the `var` capture bug, stale closures, reference-vs-value aliasing, `this`, `==`/`===`/`NaN`/`Object.is`, TDZ.
3. **Async patterns & concurrency correctness (L2)** — waterfalls/N+1, Promise combinators & partial failure, bounded concurrency, `AbortController`, floating promises.
4. **Race conditions & correctness over time (L3)** — last-response-wins, stale-closure fetches, double-submit/idempotency, TOCTOU, in-flight dedup, optimistic rollback.
5. **Data, immutability & state shape (L4)** — the `Object.is` bail-out, shallow-vs-deep copy, mutating vs non-mutating methods, structural sharing, derived vs stored state.
6. **The React rendering model (L5)** — what triggers a render, render vs commit, referential equality defeating memo, batching, reconciliation, keys, StrictMode.
7. **useEffect & hooks nuances (L6)** — the dependency array as a reactivity contract, cleanup/leaks, fetch races, "you might not need an effect", refs, `useLayoutEffect`, `useEffectEvent`.
8. **Data fetching (L7)** — component fetch races, waterfalls, N+1, caching/dedup/SWR, Suspense gotchas, optimistic updates, over/under-fetching, RSC data flow.
9. **Performance & re-render optimization (L8)** — Profiler-driven diagnosis, the memo cost model, context re-renders & selectors, virtualization, transitions, code splitting.
10. **Memory leaks, lifecycle, forms & events (L9)** — setState-after-unmount, leaking timers/subscriptions/listeners/observers, controlled-vs-uncontrolled inputs, synthetic events, focus/a11y.
11. **TypeScript in real React (L10)** — discriminated unions for UI state, `unknown`-vs-`any` at the boundary, type guards, generics in components/hooks, typing props/refs, where casts leak runtime bugs.
12. **Production-grade React & architecture (L11)** — the `'use client'` serialization seam, hydration, streaming SSR, concurrent tearing, state-management choice, race-safe mutations, error boundaries, testing.

Three cross-cutting shifts recur throughout and are called out where they land. **The React Compiler changes the
memoization story but not the correctness story** — it auto-memoizes references so most hand-written
`useMemo`/`useCallback` become redundant, but it does not fix stale closures, in-place mutation, effect races,
dependency-array semantics, or bad architecture, and it silently bails out on code that breaks the Rules of
React. **RSC and the App Router move code across a runtime boundary** — server components have no client event
loop and never hydrate, Server Actions are public endpoints, and props crossing the wire must be serializable —
so "which runtime does this run in" becomes a first-class question. And **`Object.is` reference identity is the
one mechanism that ties the whole course together**: it is what `useState` bail-out, `useMemo`/`useEffect`
dependency arrays, `React.memo`, and `useSyncExternalStore` snapshots all compare with, which is why a single
in-place mutation or a fresh inline object literal echoes through every layer.

---

## Brief 1 — The JS runtime & event loop (L0)

Every React bug that "shouldn't be possible" bottoms out here. React is a library that schedules work onto the
same single-threaded event loop the browser uses to run your handlers, drive layout, and paint, so you cannot
reason about *when* a `setState` is visible, *why* `Loading…` never appears, or *how* a slow render blocks typing
without a correct model of the loop.

### Run-to-completion: a DOM write is not a paint

The foundational law is **run-to-completion**: the event loop dequeues a task, runs it to the end of the
synchronous call stack with no preemption, and only *then* can the browser paint or take the next task. This is
why the canonical `button.onclick = () => { el.textContent = 'Loading'; heavySyncWork(); el.textContent = 'Done'; }`
never shows `Loading` — both DOM writes and the 2-second busy loop happen inside one task, and the browser cannot
repaint until the handler returns to the loop, so the user jumps straight from the old UI to `Done`. The fix is to
*yield* — hand control back with `await` of a macrotask (or `scheduler.yield()`) between the write and the work —
not merely to call another function. The **live demo** makes this undeniable: a "main thread BUSY" indicator and a
DOM label that provably never repaints to `Loading` until the loop ends, with a toggle that inserts `await 0`
before the work and watches `Loading` suddenly paint first ([MDN — the event
loop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop); Jake Archibald, "In The Loop").

### The two-queue ordering law and microtask starvation

After each macrotask, the loop drains the **entire** microtask queue — including microtasks queued *during* the
drain — before taking the next macrotask. Microtask sources are Promise `.then/.catch/.finally`, `await`
continuations, `queueMicrotask`, and `MutationObserver`; macrotask sources are `setTimeout/setInterval`, message
events, I/O, and user events. So the canonical predict-the-output — `setTimeout(()=>log('B'))`,
`Promise.resolve().then(()=>log('C'))`, `queueMicrotask(()=>log('D'))`, `log('E')`, preceded by `log('A')` —
resolves to **A, E, C, D, B**: synchronous code first, then all microtasks, then the timer. The **live demo** is a
three-lane visualizer (Call Stack / Microtask Queue / Task Queue) where tokens flow in and drain so the learner
*sees* `C` and `D` empty completely before `B` runs, plus a predicted-vs-actual console that flashes mismatched
lines red. The dark corollary is **microtask starvation**: `function loop(){ Promise.resolve().then(loop) } loop()`
freezes the tab solid — no paint, no input, no timers — because a self-requeuing microtask never lets the queue
empty, whereas the `setTimeout(loop, 0)` version lets an on-page counter keep ticking. Same user-visible symptom
as a busy `for`-loop, no CPU loop in sight (Archibald, "Tasks, microtasks, queues and schedules").

### What `async/await` desugars to, and where it yields

`await` does not "pause the program" — it splits the async function, and everything after it becomes a
continuation scheduled as a **microtask** when the awaited value settles. Control returns to the caller
synchronously at the first `await`, so given `async function f(){ log('a'); await g(); log('b') }` called before
`log('c')`, the order is **a, c, b**. Critically, `await` yields *even on non-promises*: `log(1); (async()=>{ await 0; log(3) })(); log(2)` prints **1, 2, 3**, because `await` wraps its operand via `PromiseResolve` and defers the
continuation regardless. The **live demo** is a split view — async source on the left, hand-desugared `.then` form
on the right — with a moving highlight that jumps *out* to the caller at `await` and resumes on the next tick.
Modern engines matter here: since V8 7.2 the `await`-on-a-native-promise cost dropped from three microtask ticks
to one ([V8 — "Faster async functions and promises"](https://v8.dev/blog/fast-async)), though custom thenables
still cost extra ticks and can lose an ordering race to a native promise.

### Sequential awaits, blocking work, and the scheduling primitives

Two of the highest-frequency real-world bugs live here. **Accidental waterfalls**: `for (const id of ids) results.push(await fetchUser(id))` serializes independent I/O so latencies *add* (~2000 ms for 20 calls) instead of
overlapping (~120 ms with `Promise.all(ids.map(fetchUser))`); the live demo runs both against a 100 ms mock fetch
and renders two timing bars, stacked vs overlapping. **Blocking the main thread**: heavy `JSON.parse`, `.sort`, or
crypto on every keystroke drops frames and tanks **INP (Interaction to Next Paint)**, the Core Web Vital that made
main-thread discipline a measurable production concern — and `async/await` does *not* help, because it only
interleaves I/O waiting, never CPU work. The modern fix ladder is reduce work → memoize → chunk/yield with
`scheduler.yield()` (the standardized replacement for `setTimeout(0)` chunking, which improves INP directly) →
offload to a Web Worker for true parallelism ([web.dev — "Optimize long
tasks"](https://web.dev/articles/optimize-long-tasks); [web.dev — INP](https://web.dev/articles/inp)). And
`setTimeout(0)` *lies*: the HTML spec clamps nested timers (nesting ≥ 5) to a 4 ms minimum, background tabs
throttle to ≥ 1 s, and it always runs after the current task *and* all microtasks — never truly immediate.
Choosing the primitive relative to paint (microtask coalesces before paint, `requestAnimationFrame` runs
right before paint for layout reads, `requestIdleCallback`/`scheduler.postTask` for deferrable work) is the
discipline that eliminates flicker, forced reflow, and jank.

### The React tie-ins

React rides these exact rules. **Automatic batching** (React 18+ `createRoot`) coalesces `setState`s within a
handler *and* within the microtask that resumes after an `await` into one render; legacy `ReactDOM.render` only
batched synthetic-event handlers, which is why post-`await` `setState`s used to flush separately. The **async
race** — `useEffect(() => { fetchUser(id).then(setUser) }, [id])` with no cleanup — is a closure-plus-event-loop
interaction: each effect run closes over its own `id`, promises resolve in completion order not request order, and
the last resolve wins, painting the wrong user. And React 19's **concurrent scheduler** time-slices rendering and
yields between slices via a `MessageChannel`/`postTask` macrotask so the browser can paint and handle input;
`startTransition` marks updates interruptible and `useDeferredValue` renders a lagged copy — but this all
*cooperates with* the event loop you already learned; it adds no threads. The recurring correction: the React
Compiler auto-memoizes to cut re-renders but does **not** change event-loop scheduling or make blocking code
async.

*L0 misconceptions:* that `setTimeout(fn,0)` runs immediately or before a queued promise callback; that `await`
pauses the whole program; that `async/await` makes CPU-bound work non-blocking; that concurrency (interleaved
waiting on one thread) is parallelism (Workers); that a state/DOM write paints before the rest of the synchronous
tick; that `try/catch` around a non-awaited async call catches its rejection; that multiple `setState`s *always*
coalesce; that `await` on a native promise still costs three ticks; that Node and the browser resolve the same
ordering (Node adds `process.nextTick` + `setImmediate` and a phased loop).

---

## Brief 2 — Closures, scope, references & identity (L1)

Closures and reference identity are the language substrate under almost every React state bug. React makes each
render a **snapshot** — props and state are frozen constants for that render — so a callback created in one render
that runs in a later one is closing over stale values, and any state you hold by reference is subject to the
`Object.is` change-detection that decides whether the screen updates at all.

### Closures capture bindings, not snapshots

The canonical demo is the **3,3,3 loop**: `for (var i=0;i<3;i++) setTimeout(()=>log(i))` prints `3,3,3` because
`var` is function-scoped so every deferred callback shares *one* binding that has already advanced to its terminal
value, while `let` prints `0,1,2` because the spec rebinds and copies `i` per iteration. Closures capture the
*variable*, not the value at creation time. In React this becomes the **frozen counter**:
`useEffect(() => { const id = setInterval(() => setCount(count + 1), 1000); return () => clearInterval(id) }, [])`
sticks at 1, because `[]` runs the effect once and the interval closes over render-0's `count` forever. The three
fixes with their trade-offs — the functional updater `setCount(c => c + 1)` (reads the latest queued state), a
`useRef` mirror of the latest value (the escape hatch when you need the value, not just to increment), and React
19.2's `useEffectEvent` (a non-reactive callback that always sees fresh props/state without re-subscribing) — are
the whole lesson. The live demo shows the captured value stuck at 0 while the on-screen state climbs: the gap
between "what the closure remembers" and "current state" (Dan Abramov, "Making setInterval Declarative"). The
**misconception to kill**: adding the value to deps "fixes" it but tears down and recreates the interval on every
change, resetting the timer.

### Reference-vs-value: mutation is invisible to React

Objects and arrays are held by reference. Mutating state in place — `todos.push(x); setTodos(todos)` — keeps the
same reference, so React's `Object.is(prev, next)` bail-out sees no change and skips the render entirely; the data
changed but the screen is frozen. The live demo runs two identical lists side by side, mutate vs immutable-copy,
with a `prev === next` badge showing `true` on the mutating side. The subtle trap is **shallow copy**:
`const next = { ...state }; next.profile.name = 'X'` copies only the top level, so the nested `profile` is still
the *same* reference — you just mutated the original and any memo/undo snapshot holding it. Correct updates must
spread every level along the path being changed. `.sort()` and `.reverse()` are the classic review traps: they
mutate in place *and* return the same reference, so `setState(items.sort())` is a double bug; copy first
(`[...arr].sort()`) or use React 19's `toSorted`. `structuredClone` is the modern true-deep-copy primitive
(baseline in browsers and Node 17+), but React rarely wants a full deep copy — it wants **structural sharing**
(clone only the changed path, reuse untouched subtrees), which is exactly what Immer and Redux Toolkit produce and
what keeps memoized siblings from all re-rendering ([MDN —
`structuredClone`](https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone)).

### Identity in dependency arrays and `React.memo`

A fresh inline `{}`, `[]`, or `() => {}` is a new reference every render, so it defeats every `Object.is`
comparison downstream: `useEffect(() => fetchData(options), [options])` with `const options = { page }` built
inline re-fires every render (and can infinite-loop if the effect setStates), a `useMemo` never hits, and a
`React.memo` child always re-renders — one unstable prop defeats the whole memo. `useCallback` and `useMemo` exist
solely to preserve reference identity for exactly this reason. The **modern note** everywhere in this brief: the
React Compiler auto-memoizes these references and largely retires manual `useMemo`/`useCallback`, but only for
components that follow the Rules of React, and it deliberately does **not** rescue in-place state mutation (it
memoizes on identity, so an in-place mutation still reads as unchanged — and can make the bug *more* likely to be
skipped).

### `this`, coercion, and the equality regimes

`this` is set by the **call site**, not the definition: `const g = obj.greet; g()` throws because a bare call's
`this` is `undefined` under strict mode/ES modules; arrows capture `this` lexically and ignore the call site
(which is why event handlers use arrow fields), but an arrow can't be a prototype method needing dynamic `this`
and can't be a constructor — so "arrows are always safer" is wrong. On equality: `==` runs the Abstract Equality
coercion algorithm (`0 == ''`, `'' == false`, `[] == ![]` all true, and the non-transitive `0 == '0'` true but
`'' == '0'` false), while the one sanctioned loose check is `x == null` (true for exactly `null` and `undefined`).
And three equality regimes disagree on edge values: `===` (NaN ≠ NaN, -0 === +0), `Object.is` (NaN = NaN, -0 ≠
+0), and `SameValueZero` used by `Array.includes`/`Map`/`Set` (NaN = NaN, -0 = +0). `NaN !== NaN` breaks
`indexOf`/dedup on parse failures — use `Number.isNaN` (not the coercing global `isNaN`) — and because React's
bail-out and dependency comparison use `Object.is`, NaN deps are treated as equal (won't re-fire) while -0 vs 0
are treated as different. Finally, **hoisting and the TDZ**: `var` hoists as `undefined` (silent wrong value)
while `let`/`const` are hoisted *uninitialized* and throw a `ReferenceError` if touched before their line —
converting silent bugs into loud ones. Nothing "moves to the top"; only the binding is registered at scope entry.

*L1 misconceptions:* that closures capture a value snapshot rather than the live binding; that adding a value to
deps is always the right fix; that `{...obj}` is a deep copy; that mutating state then calling `setState` with the
same variable re-renders; that arrows are universally safer for `this`; that `isNaN()` is the right NaN check;
that `===` handles NaN and -0 sanely; that `null == undefined` extends to `null == 0`; that hoisting physically
moves code; that the React Compiler fixes stale closures and mutation; that multiple `setState(value)` calls in
one handler apply sequentially (batching folds them and the last captured value wins — use `setCount(c => c+1)`).

---

## Brief 3 — Async patterns & concurrency correctness (L2)

This brief is the applied layer over the L0 event loop: the everyday async patterns engineers get subtly wrong.
The through-line is that JavaScript is single-threaded but **not interleaving-free** — `await` yields the loop, so
correctness over time (ordering, cancellation, error propagation, back-pressure) has to be designed, not assumed.

### Waterfalls, N+1, and choosing the combinator

The `await`-in-a-loop **waterfall** (`for (const id of ids) users.push(await fetchUser(id))`) is the same N+1 bug
databases have: N sequential round-trips that should be one parallel burst via `Promise.all(ids.map(fetchUser))` —
which preserves *input* order in its result array even though completion order differs, killing the "I need order
so I must serialize" excuse. `.reduce(async …)` and `for await` over a non-stream are the same bug disguised. But
the combinators have distinct semantics that a wrong choice silently breaks: `Promise.all` is **fail-fast** (one
rejection rejects all, discarding every successful result) and does **not** cancel the losers, which keep running
unhandled — so one flaky call blanks a whole dashboard and leaks work; `Promise.allSettled` never rejects and
returns a tagged `{status, value, reason}` array for partial success; `Promise.race` settles on the first to
*settle* (resolve **or** reject); `Promise.any` settles on the first to *fulfill* and rejects only when all fail
(with an `AggregateError`). A timeout built on `any` (wrong) or a "first success" built on `race` (a fast
rejection wins and breaks it) is a canonical mistake. The live demo fires the same task set through all four
combinators side by side, highlighting which one settles on what and showing `race`'s timeout leaving the loser
still running.

### Bounded concurrency and cancellation

Unbounded `Promise.all(bigArray.map(callApi))` opens thousands of connections at once — 429s, socket/DB-pool
exhaustion, OOM. The fix is a **promise pool** (`mapWithConcurrency(items, limit, fn)` that keeps at most `limit`
in flight by pulling from a queue as each finishes, or `p-limit`), and the live demo is a concurrency slider over
60 tasks with a gauge capped exactly at the limit. The modern cancellation primitive is **`AbortController`**:
pass `controller.signal` to `fetch`, call `controller.abort()` in the effect cleanup, and filter the resulting
`AbortError` (a `DOMException`) out of the catch so it isn't shown as a real error. As of 2024,
`AbortSignal.timeout(ms)` gives declarative timeouts and `AbortSignal.any([...])` combines cancel + timeout
without manual `setTimeout` + abort wiring ([MDN —
`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal)). Store the controller in a ref, not
state; abort stops the *client* waiting, not necessarily server work already started.

### Floating promises, error boundaries, and the forEach trap

`try { doAsync() } catch(e){}` never fires — the un-awaited promise rejects on its own microtask, escaping the
`try` entirely; you must `await` (or `return await`) inside the `try` for the catch to see it, and `return
somePromise` without `await` hands the promise to the caller and loses the local catch and stack frame. A
**floating** rejecting promise fires `window.onunhandledrejection` in the browser and *terminates the process* by
default in Node ≥ 15 — so intentional fire-and-forget must attach `.catch`, and `@typescript-eslint/no-floating-promises`
is the mechanical guard. `items.forEach(async x => { await save(x) })` discards the returned promises, so `'done'`
logs before the saves finish and their rejections float — choose deliberately between `for…of` + `await` (serial),
`Promise.all(map)` (parallel), or a pool. The live demo wires a panel to `window.onunhandledrejection` that
flashes red for the floating rejection while the `try/catch` stays silent.

### The React 19 async layer

React 19 productionizes several of these patterns. **Async Actions** — `startTransition(async () => { await save() })`, `useActionState`, `useFormStatus`, `useOptimistic` — auto-manage pending state, route thrown errors to the
nearest error boundary, and auto-revert optimistic values, replacing hand-rolled `isLoading` + `try/catch` that is
race-prone (double-submit, stuck spinners). The **`use(promise)`** hook reads a promise during render and
suspends — but it requires a **cached/stable promise**; passing `use(fetchTodo(id))` created inline suspends
forever because each render is a new pending promise, so the promise must be created in a parent, a cache, or an
RSC Server Component and passed down. On the server, an `async function Page()` can `await` directly, but
sequential awaits across nested async Server Components create a *server-side* waterfall invisible in the network
tab — parallelize with `Promise.all` or the preload pattern (call the fetch early, await late). And Next.js 15
flipped `fetch` to uncached-by-default with dynamic GET route handlers, so old auto-dedupe assumptions now cause
N+1 or stale data. The recurring correction: the React Compiler is not a concurrency tool — it does not fix
debounce identity churn, floating promises, stale-response races, or `AbortController` wiring.

*L2 misconceptions:* that `Promise.all` cancels the other promises on rejection; that `await` in a for-loop runs
iterations in parallel; that `Promise.race` cleans up its loser; that `array.forEach(async …)` awaits each item;
that `try/catch` around an un-awaited call catches its rejection; that `Promise.any` and `race` are
interchangeable; that `allSettled` can reject; that an inline-defined debounce works; that React 18 "fixed the
async leak" so cleanup is unnecessary; that `use(fetch(id))` works like a synchronous data call; that marking a
`useEffect` callback `async` is fine (it returns a promise React treats as the broken cleanup).

---

## Brief 4 — Race conditions & correctness over time (L3)

Where L2 is about the *shape* of async code, L3 is about **time-of-check-to-time-of-use** correctness: the fact
that state read before an `await` may be stale after it, that overlapping requests resolve out of order, and that
a guard which isn't updated until after a yield lets multiple entrants through. Every bug in this brief has the
same skeleton — *the state that would stop a second entrant isn't committed until after an await* — and this is
the band that most distinguishes senior answers in interviews.

### Last-response-wins and the ignore-flag / AbortController pair

The archetype is the typeahead: `useEffect(() => { fetch(`/user/${id}`).then(r=>r.json()).then(setUser) }, [id])`
switched fast — id 1 (slow) then id 2 (fast) — where id 1 resolves last and clobbers id 2, painting the wrong
user with no error. Network order ≠ request order, and each effect closure still holds a live `setUser`. The React
fix is the cleanup function: `let ignore = false; return () => { ignore = true }`, checked before `setUser`,
because React runs the previous effect's cleanup before the next effect. That guards the *state commit* but the
superseded request still runs; layering `AbortController` on top cancels the network work too. The live demo
switches ids fast with randomized latency and shows the buggy card flipping to the wrong user, then a strikethrough
badge on every discarded response once the guard is on. **StrictMode's dev double-mount deliberately fires the
effect twice to surface a missing cleanup** — if your fetch dedupes or breaks under StrictMode, you have this bug
(react.dev — "Synchronizing with Effects", "Fetching data").

### Double-submit, TOCTOU, dedup, and the promise-lock

**Double-submit**: a slow "Pay" button clicked twice charges twice, because `setState` is async and the re-render
that disables the button hasn't committed before the second synchronous click's handler runs — an in-handler
`ref` lock closes the microgap a state flag can't, but the durable fix is a server-side **idempotency key**
(client-generated, stable per user-intent, so a retry is a no-op). **TOCTOU**: `if (!cache[id]) { cache[id] = await fetch(id) }` called concurrently lets all callers pass the `if` during the `await` gap and all fetch; the fix is to
make check-and-act atomic by caching the in-flight **promise** synchronously before the first await
(`if (!inflight[id]) inflight[id] = fetch(id); return inflight[id]`) — a boolean lock prevents dupes but throws
away the shared result, whereas the promise both dedupes *and* shares the value. **In-flight dedup** (single-flight)
is the same primitive at component scale: N components mounting `useUser(1)` should produce one request, which
TanStack Query does via the query key, and which `React.cache()` does on the server within one render (for
*consistency*, a single point-in-time snapshot, not just perf). These three — double-submit, TOCTOU, dedup — are
one mechanism wearing three hats.

### Optimistic updates, tearing, and the Server Action twin

**Optimistic updates** show the change instantly but must reconcile with server truth on settle and roll back on
failure, or a failed mutation leaves a phantom like on screen; React 19's `useOptimistic` owns the overlay and
auto-reverts when the surrounding transition settles — but rapid toggles create their own ordering race where the
last *server-confirmed* value must win, not the last optimistic paint. **Concurrent tearing**: under
`useTransition`/Suspense a render can be interrupted, paused, and resumed, so a component reading a mutable
external store via a hand-rolled `useEffect` + `useState` subscription can observe different values in the same
commit; **`useSyncExternalStore`** forces a consistent synchronous read and is the sanctioned bridge (Redux,
Zustand, Jotai use it internally). And every client-side race has a **server-side twin**: Server Actions POST
before hydration (progressive enhancement), so a client-only disabled-button guard can't cover the pre-hydration
submit — server idempotency (DB unique key/upsert) is mandatory, not optional.

*L3 misconceptions:* that a loading spinner fixes ordering; that single-threaded means no races; that the React
Compiler fixes stale closures or races; that debounce fixes ordering (you need cancellation/tag-matching too);
that `useTransition`/`useDeferredValue` touch the network; that a disabled button is double-submit protection;
that a boolean lock is as good as caching the in-flight promise; that catching `AbortError` as a real error is
correct; that passing a fresh promise to `use()` gets cached; that React auto-dedupes *client* fetches; that a
render always commits (concurrent React can discard it before effects run); that regenerating the idempotency key
per retry is fine (it defeats the purpose).

---

## Brief 5 — Data, immutability & state shape (L4)

This brief isolates the single mechanism the previous briefs kept touching: React detects change by **reference
identity via `Object.is`**, never by value. Everything about immutability, copy depth, mutating methods, and
derived state follows from that one fact.

### Mutation is invisible; shallow copy hides nested mutation

`state.push(x); setState(state)` is the archetype: the data changed but React compares `Object.is(prev, next)`,
sees the same reference, and bails out — no reconcile, no commit. The live demo proves the *data* changed (a
length probe ticks up) while the *screen* stays frozen, separating "mutation happened" from "UI updated". Because
spread is only one level deep, `const next = {...state}; next.profile.address.city = 'NYC'` mutates the original's
nested `address` too (they alias) — you must spread every object on the path from root to the changed field. The
mutating-vs-non-mutating method split is worth memorizing: mutators are `push/pop/shift/unshift/splice/sort/reverse/fill/copyWithin`; non-mutators are `map/filter/slice/concat/flat/flatMap/reduce/spread`; and `arr.sort()`
returns the *same* reference it mutated, so `setState(arr.sort())` is the double bug (in-place mutation + same
ref). The live demo colors each method green (pure) or red (mutates) on a fresh `[3,1,2]`, and shows the default
lexicographic-`sort` gotcha (`[1,10,2,20]`).

### structuredClone's blind spots and structural sharing

`structuredClone` handles `Date/RegExp/Map/Set/typed arrays/circular refs` that `JSON.parse(JSON.stringify())`
mangles (Date → string, `undefined`/functions dropped, NaN/Infinity → null, prototype lost, cycles throw) — but it
silently drops functions/symbols and **throws `DataCloneError`** on class instances, DOM nodes, and proxies. The
deeper point is that React rarely wants a deep clone at all: correct immutable updates use **structural sharing**
— new references for every node from the root down to the changed field, *reusing* untouched subtrees — so that a
memoized child keyed on an unchanged `prefs` reference doesn't re-render. Over-cloning the whole tree breaks
memoization by giving every subtree a new reference; this is exactly what Immer's `produce` and Redux Toolkit do
under the hood (mutable-looking drafts, structural-sharing output).

### Derived vs stored state, and the modern immutable methods

Copying props/state into new state plus a `useEffect` to "keep it in sync" creates two sources of truth that drift
and adds a render pass that flashes stale: `const [count, setCount] = useState(items.length); useEffect(() => setCount(items.length), [items])` should just be `const count = items.length` computed in render. To *reset*
derived state on identity change, prefer a `key` prop (remount) over an effect that setStates (react.dev — "You
Might Not Need an Effect"). React 19 adds the copying array methods **`toSorted`, `toReversed`, `toSpliced`, and
`with(i, v)`** — the idiomatic immutable state update, no copy-then-mutate dance — and `Map`/`Set` state need a
fresh container (`new Map(prev)`, `new Set(prev)`) because their methods mutate and return the collection. The
symmetry to teach is the two ways identity betrays a beginner: **mutate state and it won't render for the wrong
reason; mutate a `ref` and it won't render by design** (`ref.current` writes are intentionally invisible to
reconciliation). And `useSyncExternalStore`'s `getSnapshot` must return a **cached** snapshot, or building
`() => state.items.filter(f)` fresh each call trips the "getSnapshot should be cached" infinite loop — the same
identity theme at the external-store boundary. The React Compiler (v1.0, stable) assumes immutability and slices
code into memoizable reactive scopes; local mutation of values created *this* render is allowed and idiomatic, but
prop/state mutation makes it bail out (or, if you break rules it can't see, surfaces latent bugs) — so correct
immutability is now a **correctness** requirement, not just a best practice.

*L4 misconceptions:* "I used the spread operator so it's immutable" (spread is shallow); that React does
deep/value equality (only `Object.is`/shallow); that `structuredClone`/JSON clone is what React needs (it wants
structural sharing); that a brand-new object with identical fields won't re-render (it does — React compares refs,
not values); reaching for `useEffect` to sync derived state; over-memoizing instead of fixing unstable references;
that `.sort()/.reverse()/.splice()` return copies; that `Map`/`Set` don't need a fresh container; that any object
can cross the RSC boundary.

---

## Brief 6 — The React rendering model (L5)

Once identity is understood, the rendering model is the next layer: *what* schedules a render, the two phases a
render passes through, and how reconciliation and keys map old instances to new data. Most "performance"
instincts are wrong because they optimize the wrong thing without this model.

### What triggers a render, and render vs commit

A component re-renders when **its own `useState`/`useReducer` fires, a subscribed context value changes, or an
ancestor re-renders** — *not* because a prop changed. By default every child re-renders when the parent does,
regardless of props; a re-render with identical props is normal, not a bug, unless it's expensive. "Render" means
React calls the function to compute elements, which is a *disposable, pure* computation that concurrent React can
pause, abort, or restart; **commit** is the one-time phase where React applies DOM diffs, then runs refs and
`useLayoutEffect` synchronously, then paints, then runs `useEffect`. This is why side effects in the render body
are a bug: the render can be thrown away for a tree that never commits, and refs are `null` during render for
not-yet-committed nodes (react.dev — "Render and Commit"). The live demo shows a Profiler-style overlay where a
state update makes render run possibly twice but commit exactly once.

### Batching, functional updaters, and the `Object.is` bail-out

`setCount(count + 1)` called three times in one handler only adds 1, because the state variable is a frozen
closure value all three reads see; `setCount(c => c + 1)` composes because each updater reads the latest queued
value. React 18+ **automatic batching** coalesces all updates in a tick — events, promises, `setTimeout`, native
handlers — into one render, so you never observe intermediate states; `flushSync` opts out for a synchronous DOM
update (focus/scroll measurement), rarely. And setting state to an `Object.is`-equal value **bails out** and skips
the render — which is why mutating an array and setting the same reference silently does nothing, and why
immutable updates are required, not stylistic (react.dev — "Queueing a Series of State Updates").

### Reconciliation, keys, and StrictMode

React diffs the element tree **by type then position**: same type at a slot reuses the instance and its state;
a different type unmounts and remounts, blowing away `useState`, refs, focus, and scroll — so a conditional
wrapper `{cond ? <div><Input/></div> : <Input/>}` wipes the input's text on toggle. **Keys** identify instances
across renders; `key={index}` on a reorderable/deletable list mismatches state to the wrong row (wrong checkbox
checked, deleting row 2 clears row 3), because after an insert index N now points at different data;
`key={Math.random()}` is worse — a new key every render forces a full remount. Conversely, a *deliberately
changing* key is the idiomatic way to reset a subtree (`<ProfileForm key={userId} />`), better than an effect that
copies props into state. **StrictMode** double-invokes render, state initializers, and mount→unmount→mount effect
cycles in dev to surface impurity and missing cleanup; production runs each once. The correct response is
idempotent, reversible effects (cleanup, `AbortController`) — not a `hasRun` ref or removing StrictMode. Two more
identity-driven render bugs round out the brief: an inline `<Ctx.Provider value={{...}}>` object re-renders *every*
consumer on every provider render (fix: `useMemo` the value, or split state/dispatch into two contexts, since
`memo` does *not* stop a context-driven re-render), and an eager `useState(expensiveInit())` re-runs the
expensive call every render — use the lazy `useState(() => expensiveInit())` form.

The **React Compiler** correction lands hardest here: it auto-memoizes components and values (v1.0, stable, in
production at Meta), making most manual `useMemo`/`useCallback` redundant, but it **reduces unnecessary re-renders
by memoizing — it does not change what triggers a render**, and it silently bails out on impure/non-idiomatic
code, so it fixes neither index-key bugs, context-value identity, nor effect misuse.

*L5 misconceptions:* that a re-render always writes the DOM; that changing a prop triggers the child's render;
that `React.memo` is a silver bullet (one inline object/array/function prop defeats it); that `useMemo`/`useCallback`
are about caching speed rather than reference identity; that `setState` is synchronous; that three `setState`s
cause three renders; that StrictMode's double-invoke is a bug to suppress; that index-as-key is fine on a list
that later reorders; that `React.memo` protects against a consumed-context change; that the Compiler changes *what*
triggers renders.

---

## Brief 7 — useEffect & hooks nuances (L6)

`useEffect` is the most misused hook because it is taught as a lifecycle callback when it is a **synchronization
primitive**. The dependency array is not a "run less often" knob — it is a *reactivity contract* declaring every
reactive value the effect reads, and a lie in it is a correctness bug, not a style choice.

### The dependency array as a contract, and stale closures

`useEffect(() => { const c = connect(serverUrl, roomId); return () => c.disconnect() }, [])` never reconnects when
`roomId` changes — `[]` was a bug, not a feature, because after every render React shallow-compares (`Object.is`)
each dep and re-runs cleanup-then-effect on change; removing a dep doesn't stop the value changing, it just freezes
the effect on render-0's value. `react-hooks/exhaustive-deps` is a correctness lint; a `// eslint-disable` above a
non-empty effect body is the smell. The stale-closure interval (`setInterval` reading `count` under `[]`, stuck at
1) is fixed by the functional updater, by adding the dep (which resets the timer), or by a ref — trade-offs the
learner must articulate (Dan Abramov, "A Complete Guide to useEffect").

### Cleanup, the fetch race, and "you might not need an effect"

Every subscription/timer/listener an effect creates must be undone in its cleanup, and StrictMode's dev
mount→unmount→mount exists to prove the setup and cleanup are symmetric — the live demo shows an "active
connections" meter settling at 1 with cleanup versus climbing to 2 (and leaking) without. The **fetch race** —
overlapping requests, last-to-resolve wins — is fixed with the `let ignore = false` cleanup flag (blocks the bad
`setState`) and better with `AbortController` (also cancels the request); this is why hand-rolled fetch-in-effect
is discouraged in favor of React Query/SWR/RSC, which own cancellation, dedup, and ordering. The highest-leverage
lesson is **"You Might Not Need an Effect"**: storing derived state via an effect (`useEffect(() => setFullName(first + ' ' + last), [first, last])`) causes an extra render pass and drift where `const fullName = first + ' ' + last`
in render is free and correct; user-event logic (a POST on submit) belongs in the handler, not an effect; and the
three classic anti-patterns are fetching-in-effect, adjusting-state-on-prop-change, and notifying-parent-in-effect
(react.dev — "You Might Not Need an Effect").

### Refs, `useLayoutEffect`, and `useEffectEvent`

The **latest-ref pattern** — mirror a value in `ref.current` in its own effect, read it inside an interval — lets
an effect read fresh values without re-subscribing (resetting the timer), because ref mutation isn't a render
dependency. **`useLayoutEffect`** fires synchronously after DOM mutation but *before* paint (commit →
`useLayoutEffect` → paint → `useEffect`), so measuring layout and repositioning belongs there to avoid a
one-frame flicker — but it blocks paint and warns under SSR, so default to `useEffect`. React 19.2's
**`useEffectEvent`** (stable Oct 2025) is the sanctioned replacement for the latest-ref shim: a non-reactive
callback that always reads the latest props/state, is excluded from dep arrays by the lint, and must only be called
inside effects of the same component. Two more traps close the brief: **object/function deps cause infinite
loops** (a fresh literal is never `Object.is`-equal, so the effect re-runs every render — fix with primitives,
`useMemo`, or hoisting), and **`useEffect(async () => …)`** returns a promise React treats as the cleanup
function, so cleanup never runs — the correct shape is a sync effect with an inner async IIFE plus an
ignore/abort cleanup.

The Compiler correction is specific here: it auto-memoizes render output, but effect **re-runs still hinge on
`Object.is` of the dependency array**, and react.dev explicitly keeps `useMemo`/`useCallback` as escape hatches
for values used as effect dependencies — the Compiler does not delete the dependency array or its exhaustive-deps
reasoning.

*L6 misconceptions:* that `[]` means "run once on mount" (it means "no reactive dependencies"; StrictMode runs it
twice on purpose); that suppressing exhaustive-deps controls timing (it hides a stale-value bug); that dep arrays
compare object *contents* (they use `Object.is`); that the ignore flag cancels the request (`AbortController`
does); that the Compiler removes deps-array reasoning; reaching for `useEffect` to compute derived state; using
`useLayoutEffect` everywhere (it blocks paint, breaks SSR); adding a `hasRun` ref instead of making the effect
reversible; passing an Effect Event into a dep array or child; writing `useEffect(async …)`.

---

## Brief 8 — Data fetching in React (L7)

Data fetching is where the async, race, and rendering briefs converge into one feature. The honest modern lesson
is that most of these gotchas are arguments for **not hand-rolling fetch-in-effect** — the platform (RSC,
`use()` + Suspense) and libraries (TanStack Query, SWR) exist because they own the hard parts.

### The race, the waterfall, and the N+1

The **component fetch race** (`useEffect(() => { fetchUser(id).then(setUser) }, [id])` with no cleanup) is the #1
production data bug — fixed with the ignore flag and/or `AbortController`, keyed by putting `id` in the dep array.
**Client waterfalls** are sequential `await`s with no data dependency (`const u = await getUser(); const posts = await getPosts()`) whose latency *sums* instead of maxing — parallelize independent work with `Promise.all`; and
nested-component waterfalls (a parent that fetches then renders a child that fetches) are the implicit version. The
**N+1** is a fetch inside `.map`/per-child: 25 rows each firing their own request produces 25 round-trips (queued
in stripes behind the browser's ~6-connection-per-origin cap), fixed by batching into one endpoint or a
DataLoader — and note that dedup (identical keys) does *not* fix N *distinct* keys; batching does. The live demos
are timing bars (stacked vs overlapping) and a network-waterfall panel (25 bars vs 1).

### Suspense gotchas and the caching model

`use(fetchUser(id))` created **inline in render** suspends forever, because a new promise identity each render is
a new pending promise — the promise must be hoisted, cached, or created in an RSC and passed down; the Compiler
does not rescue this. Suspense is a **coordination primitive, not a data layer**: it only reads a promise someone
else created and cached. Boundary **granularity** is architecture — one coarse `<Suspense>` hides the whole page
behind the slowest fetch and blocks the stream, while per-section boundaries reveal independently — and the
**ErrorBoundary must wrap the Suspense** (Suspense catches pending, ErrorBoundary catches rejected); inverted, a
rejection crashes the tree. On caching, TanStack Query keys data by input so N mounts share one request
(dedup) and serve cached data instantly while revalidating (**stale-while-revalidate**); the two knobs are
orthogonal and constantly confused — **`staleTime`** is the freshness window that suppresses refetch (default 0 =
always stale = refetch on every trigger), **`gcTime`** (formerly `cacheTime`, default 5 min) is how long *unused*
data survives before garbage collection, its timer running only while the query has zero observers ([TanStack
Query — caching](https://tanstack.com/query/latest/docs/framework/react/guides/caching)).

### fetch's foot-gun, optimistic updates, and RSC

`fetch()` does **not reject on HTTP 4xx/5xx** — it only rejects on network failure — so `await fetch(url)`
"succeeds" for a 500 with an HTML error page and then `r.json()` throws the fingerprint `Unexpected token <`; you
must check `res.ok` before parsing (axios/ky reject on non-2xx by default, a different mental model). **Optimistic
updates** need the full `onMutate` (cancel in-flight queries, snapshot, apply, return context) → `onError`
(restore snapshot) → `onSettled` (invalidate) dance; the step people skip is `cancelQueries`, without which a
background refetch clobbers the optimistic value mid-mutation — React 19's `useOptimistic` does this at component
level for transitions. Paginated lists should use `placeholderData: keepPreviousData` (v5) so the old page stays
on screen instead of blanking to a spinner (CLS). And **RSC** moves the waterfall to the *server* where it's
invisible in the network tab: fix with `preload()` + `React.cache()` and parallel awaits; distinguish Next's cache
layers (request memoization per render vs Data Cache vs Full Route Cache vs client Router Cache), which Next 15+
changed to uncached-by-default. React 19's `use()` + Suspense and `useOptimistic`/`useActionState` are the modern
primitives; `<Activity>` (formerly Offscreen) affects when hidden subtrees fetch.

*L7 misconceptions:* "Suspense fetches data for me" (it reads a promise someone else cached); that the Compiler
fixes re-render-triggered or Suspense-promise bugs; that `fetch` rejects on 500; that `staleTime` and `gcTime` are
the same knob; that StrictMode double-fetch is a bug to fix by removing StrictMode; that the ignore flag cancels
the request; that `Promise.all` parallelizes *dependent* awaits; that optimistic update is just `setQueryData`
before the call (needs `cancelQueries` + snapshot + rollback); that a shared cache dedups N *distinct* keys; that
client components can be async; that a query key can be just the resource name (it must include every input the
queryFn depends on).

---

## Brief 9 — Performance & re-render optimization (L8)

Performance work is where the rendering model becomes economics. The recurring mistake is memoizing by guesswork
before understanding that a parent render re-renders **all** descendants by default, and before measuring whether
the wasted render is actually expensive.

### Diagnose first, and the memo cost model

The React Profiler's flamegraph, ranked chart, and "why did this render" attribution (parent rendered / props
changed / hook changed / context changed) is the only honest way to find the hot path — and you must measure in a
**production build**, because dev is far slower and StrictMode double-renders. `React.memo` does a **shallow
`Object.is` compare per prop**, so a single inline `style={{}}`, `onClick={() => …}`, or freshly-`.map()`'d array
defeats it entirely (memo is all-or-nothing across props), and `useCallback`/`useMemo` are only as stable as their
*least-stable dependency*. The cost model people ignore: memoization is a **bet that render-cost > compare-cost +
memory**, and for primitive-only trivial components the shallow compare can cost as much as the render — a
`useMemo` over `arr.length` is almost always slower than recomputing. The live demos are a render-count badge that
stays red until the *last* unstable prop is fixed, and two identical lists where the memoized one's cumulative-time
counter ticks *up* faster because the children are trivially cheap.

### The structural fixes memo can't buy, and context

The highest-leverage fixes are structural, not `memo`: **composition** — passing an expensive subtree as
`children` from a parent that doesn't re-render keeps that element referentially stable and skips the subtree with
zero memo — and **state colocation** — pushing state down to its lowest common ancestor shrinks the render blast
radius, which "lift state up" over-applied has inflated (Kent C. Dodds, "state colocation"). **Context** re-renders
every consumer when the provider value's identity changes regardless of which field they read, so `useMemo` the
value or split it; Context has no built-in selector, so high-frequency slices need `useSyncExternalStore` (whose
`getSnapshot` must return a cached/primitive value, or it infinite-loops) or the userland `use-context-selector` —
which, despite blog titles, is **not** built into React 19 core.

### Transitions, virtualization, and the Compiler's real limits

`useTransition` marks a heavy update non-urgent so concurrent React can interrupt it to keep typing responsive
(`isPending` drives a spinner), and `useDeferredValue` renders a lagging copy — but it is **not a debounce** (it
renders ASAP at low priority, not after a fixed delay), and it only helps if the heavy child is memoized.
**Virtualization** (`@tanstack/react-virtual`) renders only the visible window (+overscan) so 50k rows become ~30
DOM nodes — with the caveats that variable row heights need measurement, keys must be stable, and off-screen rows
break Ctrl-F and a11y. The **React Compiler** (1.0, stable Oct 2025) auto-memoizes at build time, finer-grained
than hand memo and even after early returns, making most manual memo redundant — but it **bails out silently** on
Rules-of-React violations and patterns like `try/catch/finally` (surfaced by
`eslint-plugin-react-hooks`), it does **not** fix architecture, waterfalls, over-fetching, or bundle size, and
memoization isn't shared across components. Deleting all manual memo blindly on adoption can regress a
bailed-out component. Beyond React, the biggest 2024-2026 lever is often **RSC**: Server Components ship zero
component JS and never re-render on the client, so pushing `'use client'` down to small interactive islands
(and per-path imports over barrel files) beats any client-side memoization.

*L8 misconceptions:* that a re-render means a DOM update; that StrictMode's double-render is a perf problem; that
memo/`useMemo`/`useCallback` are free wins rather than a cost bet; that they guarantee stable references (React may
drop the cache); that `useDeferredValue` is a debounce; that `use-context-selector` is in core; that the Compiler
removes *all* manual memo (interop boundaries and effect-dep pinning remain); optimizing by guesswork instead of
the Profiler; wrapping the urgent input value inside `startTransition`; over-splitting bundles into many tiny
chunks; that `React.memo` deep-compares.

---

## Brief 10 — Memory leaks, lifecycle, forms & events (L9)

This brief is the operational hygiene layer: the effects that keep firing after unmount, the closures that pin
large objects, and the input/event contracts that silently produce wrong data. React 18 *removed* the
"setState on an unmounted component" warning (it was misleading and couldn't detect real leaks), so the leaks here
are invisible without instrumentation.

### The four leak families and the retained closure

Async work resolving after unmount is the mild case (a wasted `setState`); the real cost is **retained memory in
the captured closure** and the stale-response race. The four leak families each have their own teardown that must
run in the effect's cleanup: **timers** (`clearInterval`/`clearTimeout`/`cancelAnimationFrame`), **subscriptions**
(`unsubscribe()`/`socket.off`/`ws.close()`/`es.close()`/Firestore's returned unsub — `useSyncExternalStore` is the
correct primitive), **DOM listeners** (`removeEventListener` matching the **same function reference** — an inline
arrow in add/remove is a silent no-op), and **observers** (`IntersectionObserver`/`ResizeObserver`/`MutationObserver.disconnect()`). The live demos count active connections/subscribers/observers climbing across
mount/unmount cycles without cleanup and settling at 1 with it. Distinct from staleness is **real heap growth**: a
handler closing over a 50MB array pins the whole graph as long as it's registered — capture the derived primitive
(`.length`), not the object, and detect via a DevTools heap snapshot's Retainers/Detached filter. StrictMode's
dev double-invoke is the free detector for all of these; the fix is idempotent cleanup, never disabling
StrictMode.

### Controlled inputs and the value/onChange contract

An input whose `value` starts `undefined` and later becomes a fetched string flips from **uncontrolled to
controlled**, triggering React's warning and caret glitches — default to `''` (`value={user?.name ?? ''}`).
`value` with **no `onChange`** freezes the input (React overwrites the DOM value from unchanging state every
render); reformatting controlled text on each keystroke jumps the caret to the end (save/restore `selectionStart`
or format on blur). Each input type has its own contract: checkboxes use `checked` and read `e.target.checked` (not
`.value`, which is the literal `'on'`); number inputs return a *string* from `.value` (use `.valueAsNumber`, handle
empty → NaN); `<select multiple>` needs an array value read from `selectedOptions`. And `onChange` in React maps to
the DOM `input` event (fires every keystroke), not the DOM `change`/blur event — a frequent surprise.

### Synthetic events, double-submit, focus, and the React 19 form model

Two pieces of legacy advice are dead: **event pooling and `e.persist()` were removed in React 17**, so synthetic
events survive into async callbacks. React 17+ delegates events at the **React root container**, not `document`,
which changes `stopPropagation` across roots and portals (events bubble through the *React* tree, not the DOM
tree). React can't attach `passive: false` handlers, so preventing wheel/touch scroll needs a manual native
listener; and `e.preventDefault()` on `onSubmit` is still required to stop the full-page reload. **Double-submit**
needs a synchronous ref guard (a state flag's re-render hasn't committed before a fast second click) *plus* server
idempotency; React 19's `useFormStatus().pending` disables the submit button from inside the form. **Focus/a11y**
is silently destroyed by conditional renders and route changes — when the focused node unmounts the browser dumps
focus to `<body>` — so modals need initial focus in, a focus trap, Escape-to-close, `role="dialog"` +
`aria-modal`, and restore-focus-to-opener. Finally, **React 19 form Actions** (`<form action={fn}>`,
`useActionState` for state/error/pending in a transition, `useOptimistic`, and automatic form reset on success)
replace most hand-rolled pending/error plumbing, and **ref cleanup functions** (a ref callback may return a
cleanup) change the correct teardown pattern for observers/listeners attached via refs.

*L9 misconceptions:* that the unmount warning still exists (removed in React 18); that the Compiler removes the
need for cleanup or correct deps; that "runs twice in dev" is a bug to silence; that `e.persist()` is still
needed; that React attaches events at `document`; that a boolean ignore flag cancels the request; that an
`isSubmitting` state flag fully prevents double-submit; that number inputs give numbers; that a checkbox is
controlled via `value`; that `<form action={fn}>` keeps field values (it auto-resets); that `useFormStatus` works
in the same component that renders the form (it must be a descendant); ignoring focus after unmount.

---

## Brief 11 — TypeScript in real React (L10)

TypeScript's payoff in React is making illegal states unrepresentable and forcing validation at trust boundaries
— but its guarantees are compile-time only, fully **erased at runtime**, so the load-bearing demos show the
runtime crash, not the red squiggle. A wrong type is a wrong *value* that detonates later.

### Discriminated unions, exhaustiveness, and `unknown` at the boundary

The `{ isLoading, error, data }` boolean bag lets contradictory states coexist (loading + error + data all
truthy) and render garbage; the fix is a **discriminated union** on a literal discriminant — `{status:'loading'} | {status:'error', error} | {status:'success', data}` — where `data` is non-optional in `success`, killing the
`data!` assertions that hide bugs. **Exhaustiveness** via `assertNever` (`const _: never = state`) turns a
newly-added variant into a compile error at every un-updated switch, keeping the union honest as it grows. At the
**trust boundary**, `fetch().json()`, `JSON.parse`, and (with `useUnknownInCatchVariables`) `catch` clauses are
`unknown`/`any`: `as User` is a compile-time promise the runtime never enforces, so an API returning `price` as a
string sails through and `price.toFixed(2)` throws — only runtime validation (Zod/valibot) makes external data
actually match its type. `any` disables checking and *spreads*; `unknown` forces a narrow.

### Guards, casts, and generics

A hand-written `x is User` type guard is **trusted, not verified** — a lazy body (`'id' in x`) that skips fields
is a silent lie that crashes on the missing field; prefer schema-derived guards. `as` overrides the compiler and
`as unknown as T` defeats even TS's "insufficient overlap" rail — near-always a red flag at boundaries — while
`satisfies` validates a value against a type *without widening*, preserving literal keys for config/route/action
maps (the modern replacement for `as` on object literals). **Generic components** infer the item type from props
(`<List items={users} render={u => u.name} />`), needing the `.tsx` arrow-generic workaround `<T,>`; the classic
loss is that `forwardRef`/`memo` collapse the type param to `unknown` — which **React 19 fixes** by making `ref` an
ordinary prop typed via `React.Ref<T>`, so a plain generic function component keeps its inference (and `forwardRef`
is deprecated). React 19 also made `useRef()` require an argument and lets ref callbacks return a cleanup.

### The strict-mode flags and where casts leak

The flags that close whole bug classes: **`noUncheckedIndexedAccess`** makes `arr[i]`/`record[key]` return
`T | undefined` (surfacing out-of-bounds and missing-key crashes the default types hide), **`useUnknownInCatchVariables`** (on with `strict`), and **`exactOptionalPropertyTypes`**. Two structural gotchas recur: **excess-property
checks** fire only on *fresh* inline object literals, so a typo'd prop passed via a spread variable compiles and is
silently dropped; and **narrowing is discarded across `await`/callbacks** because the object could have mutated —
hoist the narrowed value to a `const` before the async gap. `Object.keys` returns `string[]` (not `keyof`) because
objects are open/structural, so `as keyof T` is unsound whenever runtime objects carry extra fields. Context
should be typed `createContext<T | null>(null)` with a guard hook that throws outside the provider, never
`{} as T` (a runtime lie that defers the crash). And React 19 Actions couple `useActionState<State, Payload>`'s
return to the state type while `formData.get()` returns `string | File | null` that must be narrowed. The
Compiler assumes purity TS can't check, so `eslint-plugin-react-hooks`/`react-compiler` matter more; and TS 5.5
auto-infers some predicates while `satisfies` (4.9+) and `@ts-expect-error` (over `@ts-ignore`) are the
maintainable modern tools.

*L10 misconceptions:* that types exist at runtime; that `any` and `unknown` are interchangeable; that a `x is T`
guard is compiler-verified; that `as` is "just a hint"; reaching for enums over `as const` string unions; that
excess-property checks fire everywhere; that `arr[i]` is always present; that `React.FC` is the right default;
that `JSX.Element` is the right type for `children` (use `ReactNode`); that narrowing survives an `await`;
silencing strict errors with `!`/`as any` instead of handling the case; using blanket `@ts-ignore` over
self-cleaning `@ts-expect-error`.

---

## Brief 12 — Production-grade React & architecture (L11)

The capstone brief is where all the prior mechanisms meet the deployment target: which runtime code runs in, how
server HTML becomes an interactive client tree, and what senior/staff front-end interviews actually probe. The
2024-2026 shift is that "React" now spans a server runtime with no event loop, a serialization wire, and a hydration
handshake — so "where does this run" is the first architectural question.

### The `'use client'` seam, Server Actions, and hydration

`'use client'` marks a **boundary in the module graph, not a location** — the file and everything it imports become
the client bundle, but it still SSRs; it does not mean "browser only". Props crossing server → client must be
**serializable** by React's Flight protocol (primitives, plain objects/arrays, JSX, Promises, Server Action refs —
**not** functions, Dates, class instances, `Map`/`Set`), which is why the "donut" pattern passes a Server
Component as `children` to a Client Component to keep server-only code out of the bundle. **Server Components**
are async and can touch the DB/secrets but have no hooks, events, or browser APIs; over-marking `'use client'` at
a layout root ships the whole subtree as client JS. **Server Actions are public POST endpoints** — a stable
endpoint id anyone can replay — so auth, input validation, and idempotency must live *inside* the action, and
bound closure variables are serialized to the client and back (treat them as attacker-controlled). **Hydration
mismatch** from non-deterministic render (`new Date()`, `Math.random()`, `localStorage`/`window` read during
render) makes server HTML differ from the first client render; React 19 discards the server tree for that boundary
and re-renders (flash + lost SSR benefit), with precise diff logging. The fix is a deterministic first render
(placeholder, real value in `useEffect`) or passing the value from the server via cookies/headers —
`suppressHydrationWarning` is a scalpel for unavoidable leaf timestamps, not a fix for structural mismatch.

### Streaming, tearing, batching, and the caching model

**Streaming SSR** with Suspense flushes the shell immediately and streams slow subtrees later (out-of-order), each
with its own fallback; a missing boundary blocks TTFB on the slowest fetch, and each async boundary needs an error
boundary so one failure degrades gracefully. **Concurrent tearing** (a store mutating mid-interruptible-render)
is why external stores need `useSyncExternalStore`; `useState`/`useContext` are tear-safe because React owns them.
**Automatic batching** (React 18/19) coalesces `setState`s even in promises/timeouts, so "how many times does this
render" changed at React 18 and `flushSync` is the rare opt-out. The **Next.js App Router caching model** has
multiple layers (Request Memoization → Data Cache → Full Route Cache → client Router Cache), the defaults *flipped*
across Next 14 → 15 (`fetch` no longer cached by default) → 16 (Cache Components, `'use cache'`, `cacheLife`/`cacheTag`, `updateTag`/`revalidateTag`, PPR), and a mutating Server Action that never revalidates leaves reads
stale. **Error boundaries** catch only render/lifecycle errors of descendants — **not** event handlers, async
callbacks, timers, or SSR — so surfacing an async error means routing it into render (setState an error to throw,
or a query lib's error state).

### State-management choice, race-safe mutations, and testing

The senior signal is asking **"is this server state or client state?"** before reaching for a library: server
state (async, shared, needs revalidation) belongs in a query cache or RSC, not Redux/Context where teams hand-roll
stale caching and cause re-render storms; genuine cross-cutting UI state goes to Zustand/Jotai/Redux Toolkit; URL
state to the URL. **Race-safe mutations** carry the L3 lessons to production — optimistic rollback, idempotency
keys, and the fact that `useOptimistic` reverts only when canonical state changes (a silently no-op mutation
strands the optimistic value). And **testing async React** is where flakiness lives: assert on settled UI with
`findBy*`/`waitFor` (not synchronously), understand that "not wrapped in `act(...)`" warnings mean a late
`setState` escaped the acted window, mock the network at the boundary with MSW, and *explicitly* test race and
rollback paths by resolving responses out of order. The final Compiler correction, restated at production scale:
it auto-memoizes but bails silently on unsupported patterns and never fixes architecture, waterfalls, tearing, or
bundle size — memoization is a perf optimization, not a correctness guarantee.

*L11 misconceptions:* that `'use client'` means browser-only; that error boundaries catch async/event errors;
that the Compiler makes memoization concerns disappear or fixes architecture; that Server Actions are trusted
local functions; using `suppressHydrationWarning` to "fix" mismatches; putting server state in Redux; that
multiple `setState`s in a promise cause multiple renders; that an effect runs once (StrictMode + prod remounts);
index-as-key on dynamic lists; over-memoizing without measuring while ignoring the real re-render triggers
(context-value identity, unstable deps).

---

### Cross-checked against

- **React fundamentals & the rendering model:** the [react.dev learn guides](https://react.dev/learn) — [Render and Commit](https://react.dev/learn/render-and-commit), [Queueing a Series of State Updates](https://react.dev/learn/queueing-a-series-of-state-updates), [Updating Objects in State](https://react.dev/learn/updating-objects-in-state), [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect), [Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects), [Removing Effect Dependencies](https://react.dev/learn/removing-effect-dependencies), [Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks), and the [Rules of React](https://react.dev/reference/rules).
- **The event loop, timers & Promises:** [MDN — the event loop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop) and [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise); the [WHATWG HTML event-loop processing model & timer clamping](https://html.spec.whatwg.org/multipage/webappapis.html#event-loops); Jake Archibald, ["Tasks, microtasks, queues and schedules"](https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules/) and ["In The Loop"](https://www.youtube.com/watch?v=cCOL7MC4Pl0); the V8 team, ["Faster async functions and promises"](https://v8.dev/blog/fast-async) (the `await`-tick optimization).
- **Performance, INP & scheduling:** [web.dev — Interaction to Next Paint (INP)](https://web.dev/articles/inp), [Optimize long tasks](https://web.dev/articles/optimize-long-tasks), and [scheduler.yield()](https://developer.mozilla.org/en-US/docs/Web/API/Scheduler/yield); Kent C. Dodds, ["Fix the slow render before you fix the re-render"](https://kentcdodds.com/blog/fix-the-slow-render-before-you-fix-the-re-render) and ["State colocation will make your React app faster"](https://kentcdodds.com/blog/state-colocation-will-make-your-react-app-faster).
- **Closures, effects & the ref/interval canon:** Dan Abramov, ["A Complete Guide to useEffect"](https://overreacted.io/a-complete-guide-to-useeffect/) and ["Making setInterval Declarative with React Hooks"](https://overreacted.io/making-setinterval-declarative-with-react-hooks/).
- **Cancellation, cloning & platform APIs:** [MDN — AbortController / AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) (incl. `AbortSignal.timeout`/`any`), [structuredClone](https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone), and [Object.is](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is).
- **React 19, the Compiler & concurrent features:** the [React 19 release notes](https://react.dev/blog/2024/12/05/react-19); [React Compiler docs](https://react.dev/learn/react-compiler); [useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore), [useTransition](https://react.dev/reference/react/useTransition), [useDeferredValue](https://react.dev/reference/react/useDeferredValue), [useOptimistic](https://react.dev/reference/react/useOptimistic), [useActionState](https://react.dev/reference/react/useActionState), and the [`use`](https://react.dev/reference/react/use) hook.
- **Data fetching & server-state libraries:** the [TanStack Query docs](https://tanstack.com/query/latest/docs/framework/react/overview) (keys, `staleTime`/`gcTime`, `placeholderData`, optimistic updates, request cancellation) and [SWR](https://swr.vercel.app/); [MDN — Using Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch) (the `res.ok` contract).
- **RSC, App Router & production architecture:** the [Next.js App Router docs](https://nextjs.org/docs/app) — [caching](https://nextjs.org/docs/app/building-your-application/caching), [Server Actions & Mutations](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations), and [streaming & Suspense](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming); the [React Server Components explainer](https://react.dev/reference/rsc/server-components).
- **TypeScript in React:** the [TypeScript handbook](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html) (narrowing, `unknown`, discriminated unions, `satisfies`), the [`tsconfig` strictness flags](https://www.typescriptlang.org/tsconfig#noUncheckedIndexedAccess), the [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/), and [Zod](https://zod.dev/) for boundary validation.
- **Testing:** [Testing Library — async methods](https://testing-library.com/docs/dom-testing-library/api-async/) (`findBy*`/`waitFor`, `act` warnings) and [Mock Service Worker (MSW)](https://mswjs.io/).

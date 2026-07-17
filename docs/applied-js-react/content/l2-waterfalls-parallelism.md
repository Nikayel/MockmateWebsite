> Module **2.1** (Waterfalls & Parallelism) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [1.5](./l1-hoisting-tdz.md) · Next: [2.2](./l2-promise-combinators.md)

# L2 · Waterfalls & Parallelism

After this module you will catch the single most common async performance bug in real codebases: independent I/O that runs one call at a time instead of overlapping. You will learn to see the difference between latency that adds up and latency that overlaps, and to spot the three shapes that quietly serialize your code (await in a loop, two independent awaits in a row, and `async` callbacks passed to `forEach`).

### ajr-l2-await-in-loop-waterfall: await-in-a-loop is an accidental waterfall (N+1)

- **id:** `ajr-l2-await-in-loop-waterfall`  ·  **difficulty:** medium  ·  **est:** 14 min  ·  **demo:** js-runnable  ·  **skills:** async, promise-all, waterfall

#### Learn

Picture a page that shows 20 users. You have their ids, and one function `fetchUser(id)` that takes about 100ms per call because it hits the network. The obvious code reads left to right and looks correct:

```js
const results = [];
for (const id of ids) {
  results.push(await fetchUser(id)); // waits for THIS one before starting the next
}
```

This works, and it is slow in a way that does not show up on your fast laptop against a warm cache. Each `await` suspends the whole function until that one promise settles. Only then does the loop advance to the next iteration and start the next fetch. The latencies do not overlap, they stack: 20 calls at ~100ms each is ~2000ms of wall-clock time, even though the network could have handled all 20 at once. This is the classic N+1 latency chain, sometimes called a request waterfall.

The fix is to start every independent promise first, then wait for all of them together:

```js
const results = await Promise.all(ids.map((id) => fetchUser(id)));
```

`ids.map(fetchUser)` calls `fetchUser` for all 20 ids synchronously in a tight loop, which kicks off all 20 network requests before any `await` happens. `Promise.all` then gives you one promise that resolves when the slowest of them resolves. Wall-clock time drops from the sum of the latencies to roughly the max, so ~2000ms becomes ~100 to 120ms.

**Interview nuance:** the giveaway phrase is "await inside a loop over independent items." If iteration N does not read the result of iteration N-1, it should not be awaited in sequence. Interviewers love to ask you to spot this and to state the one exception.

That exception matters. Keep it sequential when each step genuinely depends on the previous one: pagination where the next cursor comes from the previous page, a write that must land before the next read, or any true data dependency. Sequential is also the right call when you must not hammer a rate-limited endpoint, in which case you want bounded concurrency (a pool), not full parallelism and not one-at-a-time.

**Interview nuance:** `await` in a loop does not "run the iterations in parallel." Many candidates believe the loop fans out. It does the opposite: it is the most explicit way to force them one after another.

Recap: `await` inside a loop over independent work serializes latency (sum), while `Promise.all(ids.map(fn))` overlaps it (max). Serialize only on a real data dependency or rate limit.

#### See it live

**Demo (js-runnable):** 20 mock fetches at 100ms each run sequentially via await-in-loop, then again via `Promise.all(ids.map(fetchUser))`, timed with `performance.now()` and an in-flight counter.

```js
// Deterministic mock: each "fetch" resolves after 100ms.
let inFlight = 0;
let maxInFlight = 0;
function fetchUser(id) {
  inFlight++;
  maxInFlight = Math.max(maxInFlight, inFlight);
  return new Promise((resolve) => {
    setTimeout(() => {
      inFlight--;
      resolve({ id, name: "user-" + id });
    }, 100);
  });
}

const ids = Array.from({ length: 20 }, (_, i) => i + 1);

async function run() {
  // A) sequential: await inside the loop (accidental waterfall)
  maxInFlight = 0;
  const t0 = performance.now();
  const seq = [];
  for (const id of ids) {
    seq.push(await fetchUser(id));
  }
  const seqMs = performance.now() - t0;
  console.log("A) sequential await-in-loop:", Math.round(seqMs) + "ms", "peak in-flight:", maxInFlight);

  // B) parallel: start all, then await together
  maxInFlight = 0;
  const t1 = performance.now();
  const par = await Promise.all(ids.map((id) => fetchUser(id)));
  const parMs = performance.now() - t1;
  console.log("B) Promise.all(ids.map):", Math.round(parMs) + "ms", "peak in-flight:", maxInFlight);

  console.log("same results?", seq.length === par.length && par[0].id === 1);
  console.log("speedup:", (seqMs / parMs).toFixed(1) + "x");
}
run();
```

**Watch:** variant A logs ~2000ms with a peak in-flight of 1 (only ever one request at a time). Variant B logs ~100 to 120ms with a peak in-flight of 20 (all requests overlap). The two timing bars render as ~2000ms stacked versus ~120ms overlapping, and the in-flight counter climbs to 20 in the parallel run. This proves the latencies add in A and overlap in B, and that the results are identical, so the slowness bought you nothing.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Rewrite `for (const id of ids) results.push(await fetchUser(id))` to run 20 independent fetches concurrently, and name the one case where you must keep it sequential.

**Think about:**
- Why does the next fetch only start after the previous resolves?
- How does Promise.all overlap the latencies?
- When is sequential actually required?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The corrected code starts every fetch before awaiting:

```js
const results = await Promise.all(ids.map((id) => fetchUser(id)));
```

Why this works at the runtime level: `await` is not a passive marker, it suspends the async function until the awaited promise settles and only then resumes execution. In the loop, that means each iteration blocks the loop counter from advancing, so `fetchUser` for the next id is not even called until the current one resolves. The event loop is idle in between. The total time is the sum of every latency. In the `Promise.all` version, `ids.map` runs synchronously and invokes `fetchUser` 20 times back to back, so all 20 timers (real network requests, in production) are started within the same tick. `Promise.all` returns a single promise that settles when the last input settles, so wall-clock time collapses to roughly the slowest single call.

`Promise.all` also preserves input order in its result array regardless of which promise resolves first, so `results[3]` still corresponds to `ids[3]`. You do not lose ordering by parallelizing.

How to spot it in review: any `await` inside a `for`, `for-of`, or `while` that loops over independent items. Ask "does iteration N read the output of iteration N-1?" If no, it is a waterfall.

Production symptom: a list view that should paint in ~120ms takes ~2 seconds, and the waterfall is visible in the network panel as a staircase of requests that each start only when the previous finishes. This is the single most common async performance bug in real code.

The one case to keep sequential: a genuine data dependency, for example cursor pagination where the next request needs the cursor returned by the previous page, or an ordered write-then-read. A close cousin is a rate-limited endpoint, where you want bounded concurrency (a small pool, say 5 at a time) rather than either extreme.

Common misconception to correct: `await` in a loop does not run iterations in parallel. It is the clearest way to force them strictly one at a time.

**Self-check rubric:**
- [ ] I used `Promise.all(ids.map(fetchUser))`, not an awaited loop.
- [ ] I explained that `await` suspends the loop so latencies add.
- [ ] I noted `Promise.all` starts all promises before awaiting and preserves input order.
- [ ] I named the sequential exception (real data dependency such as cursor pagination).
- [ ] I mentioned bounded concurrency for rate limits rather than full fan-out.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Rate-limited enrichment. Your service enriches 5,000 order records by calling a partner API that allows at most 10 concurrent requests and returns 429 above that. `await Promise.all(orders.map(enrich))` fans out all 5,000 at once and gets you throttled; the naive await-in-loop takes 40 minutes. Write a bounded-concurrency version that keeps roughly 10 requests in flight, and explain why it beats both extremes.

**Model answer (revealed on demand):**

Neither extreme is right here. The await-in-loop is safe but serial (one request in flight, so 5,000 times the per-call latency). `Promise.all(orders.map(enrich))` overlaps everything but launches 5,000 requests in one tick and trips the 429 limit. You want a pool that keeps exactly N in flight:

```js
async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;          // claim an index synchronously
      results[i] = await fn(items[i]);
    }
  }
  const workers = Array.from({ length: limit }, () => worker());
  await Promise.all(workers);
  return results;
}

const enriched = await mapWithConcurrency(orders, 10, enrich);
```

Why this beats both extremes: you spin up exactly `limit` worker loops. Each worker grabs the next unclaimed index (the `next++` is atomic because JS is single-threaded, so no two workers take the same index), awaits one call, then loops to grab another. At any instant there are at most 10 outstanding promises, so you saturate the partner's allowance without exceeding it. Wall-clock time is roughly `(5000 / 10) * per-call latency`, a 10x speedup over serial while staying under the 429 ceiling.

How to spot the need in review: any fan-out over a large collection against an external API. Full `Promise.all` over thousands of items is a reliability bug waiting to happen (429s, connection-pool exhaustion, memory spikes from thousands of pending promises), not just a style choice.

Production symptom of getting it wrong: intermittent 429 storms and retry cascades under load, or the opposite, a batch job that runs for 40 minutes because it never overlaps. The misconception to correct is that "more parallel is always faster." Past the resource limit, more concurrency makes it slower and less reliable. In real teams, reach for a small utility like `p-limit` rather than hand-rolling this each time.

### ajr-l2-hidden-serial-awaits: Hidden serial awaits (two independent calls in a row)

- **id:** `ajr-l2-hidden-serial-awaits`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** js-runnable  ·  **skills:** async, promise-all

#### Learn

The loop version is easy to spot once you know the pattern. The sneakier version has no loop at all, just two plain lines:

```js
const user = await getUser();   // ~300ms
const posts = await getPosts(); // ~300ms
```

This reads like "get the user, then get the posts," which sounds sequential and correct. But look for a data dependency: does `getPosts()` take anything from `user`? If it does not, these two calls are independent, and awaiting them in sequence still serializes their latency. `getPosts()` will not even start until `getUser()` has fully resolved, so the total is ~600ms (the sum). There is no loop and no obvious mistake, which is exactly why this one survives code review so often.

The fix starts both before awaiting either:

```js
const [user, posts] = await Promise.all([getUser(), getPosts()]);
```

Here `getUser()` and `getPosts()` are both invoked before any `await`, so both requests are in flight at the same time. `Promise.all` resolves when the slower of the two finishes, so total time drops to ~300ms (the max, not the sum). The destructuring `[user, posts]` matches the input order, so even though `getPosts` might finish first, `user` is still the result of `getUser()`. Order is by position in the array you passed, not by resolution order.

**Interview nuance:** the tell is "multiple sequential `await` lines with no data dependency between them." Two is common, but you will also see three or four independent awaits stacked in a service function, each one silently adding to the latency budget. The fix is the same combinator.

You cannot parallelize when the second call needs the first call's output. If `getPosts(user.id)` reads `user.id`, then `getUser()` genuinely has to resolve first, and the sequential version is correct. In that case the right optimization is elsewhere (fetch less, cache, or move the join server-side), not `Promise.all`.

**Interview nuance:** a frequent misconception is that you must serialize to keep results in order. `Promise.all` guarantees positional order in the output array independent of which promise settled first, so you get both concurrency and predictable ordering.

Recap: two independent awaits in a row cost the sum of their latencies; `Promise.all([a(), b()])` costs the max and preserves input order. Only serialize when the second call consumes the first call's result.

#### See it live

**Demo (js-runnable):** `const a = await fetchA(); const b = await fetchB();` timed against `const [a, b] = await Promise.all([fetchA(), fetchB()])`, using different per-call latencies so the sum-versus-max contrast is obvious.

```js
function delay(ms, value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
const fetchA = () => delay(300, "A"); // ~300ms
const fetchB = () => delay(500, "B"); // ~500ms

async function run() {
  // A) sequential: two independent awaits in a row
  const t0 = performance.now();
  const a1 = await fetchA();
  const b1 = await fetchB();
  const seqMs = performance.now() - t0;
  console.log("A) sequential awaits:", Math.round(seqMs) + "ms", "=> [" + a1 + "," + b1 + "]");

  // B) parallel: start both, await together
  const t1 = performance.now();
  const [a2, b2] = await Promise.all([fetchA(), fetchB()]);
  const parMs = performance.now() - t1;
  console.log("B) Promise.all:", Math.round(parMs) + "ms", "=> [" + a2 + "," + b2 + "]");

  console.log("sequential was the SUM (~800ms), parallel is the MAX (~500ms)");
  console.log("input order preserved in B?", a2 === "A" && b2 === "B");
}
run();
```

**Watch:** variant A logs ~800ms (300 plus 500, the sum) and variant B logs ~500ms (the max of 300 and 500). The two timing bars render as a summed bar versus a bar the length of the longer call. Note that in B the result is still `["A", "B"]` even though B's call is slower, which proves `Promise.all` returns results in input order, not resolution order.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Rewrite `const u = await getUser(); const p = await getPosts()` (the two calls are independent) so the combined latency is the slowest single call, and explain when you could NOT do this.

**Think about:**
- Do these two calls depend on each other?
- What is the total latency each way?
- How do you keep result order when parallelizing?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

Because `getPosts()` takes no input from `getUser()`, the two calls are independent and should overlap:

```js
const [u, p] = await Promise.all([getUser(), getPosts()]);
```

Why at the runtime level: in the original, the first `await` suspends the async function until `getUser()` settles. `getPosts()` is a function call sitting on the next line, and that line does not execute until the function resumes, so the second request starts only after the first finishes. The latencies are strictly additive, ~600ms for two ~300ms calls. In the fixed version, `getUser()` and `getPosts()` are both evaluated in the same expression before any suspension, so both promises are created and both requests are dispatched in the same tick. `Promise.all` yields one promise that settles when the last input settles, so wall-clock time becomes the max, ~300ms.

Ordering is preserved by position: `Promise.all([getUser(), getPosts()])` always resolves to `[userResult, postsResult]` regardless of which network call returned first. So `u` is the user and `p` is the posts, guaranteed.

How to spot it in review: two or more consecutive `await` statements with no variable from the first appearing in the arguments of the second. Trace the data flow; if nothing crosses between them, they are parallelizable.

Production symptom: pages and API responses that feel 2 to 5 times slower than the network actually requires, with a network waterfall that shows request B starting exactly when request A ends, in a neat staircase.

When you could NOT do this: if the second call consumes the first call's output, for example `getPosts(user.id)`. Then there is a real data dependency and `getUser()` must resolve first. The sequential form is correct there, and `Promise.all` would not even compile the way you want because you would not have `user.id` yet.

Common misconception to correct: you do not have to serialize to keep results in order. `Promise.all` gives you input-order results and concurrency at the same time.

**Self-check rubric:**
- [ ] I confirmed the two calls have no data dependency before parallelizing.
- [ ] I used `Promise.all([getUser(), getPosts()])` with array destructuring.
- [ ] I stated sequential cost is the sum and parallel cost is the max.
- [ ] I explained results come back in input order, not resolution order.
- [ ] I named the case that forbids it: `getPosts(user.id)` style dependency.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Dashboard loader with a mixed dependency graph. A dashboard route runs `const user = await getUser(); const settings = await getSettings(user.id); const notifications = await getNotifications(); const billing = await getBilling();` as four sequential awaits, ~250ms each, so the page takes ~1 second. `getSettings` needs `user.id`; `getNotifications` and `getBilling` need nothing. Restructure it to the minimum possible latency and explain the shape.

**Model answer (revealed on demand):**

Only one of the four calls has a real dependency, so only that edge must stay sequential. Everything else overlaps:

```js
const user = await getUser(); // must be first: settings needs user.id
const [settings, notifications, billing] = await Promise.all([
  getSettings(user.id),
  getNotifications(),
  getBilling(),
]);
```

Why this is the minimum: the dependency graph has one required edge (`getUser` before `getSettings`) and two independent nodes (`getNotifications`, `getBilling`). You cannot start `getSettings` until `user.id` exists, so `getUser` sits on the critical path. But `getNotifications` and `getBilling` need nothing, so there is no reason to wait for the user before starting them. Grouping all three of the second-wave calls in one `Promise.all` runs them concurrently, and that wave finishes in the max of its members, ~250ms. Total wall-clock time is ~250ms (user) plus ~250ms (the parallel wave), about 500ms, down from ~1 second. That is the critical path: the longest chain of true dependencies, and no faster is possible without changing the dependencies themselves.

An even more aggressive version starts `getNotifications()` and `getBilling()` immediately, before awaiting the user, since they truly do not depend on it:

```js
const notificationsP = getNotifications();
const billingP = getBilling();
const user = await getUser();
const settings = await getSettings(user.id);
const [notifications, billing] = await Promise.all([notificationsP, billingP]);
```

Now the two independent calls run underneath the user-then-settings chain, so total time is ~500ms (the length of the dependency chain) and the independent calls are free. Kick off promises early and await them late.

How to spot it in review: a run of awaits where some lines reference an earlier result and some do not. Draw the dependency arrows; the awaits with no incoming arrow can be hoisted and parallelized. Production symptom of the naive version: dashboards that load in a slow, visible cascade even though most of their data is independent. The misconception to correct is that "there is one dependency, so it all has to be sequential." Only the dependent edge is sequential; the rest is free concurrency.

### ajr-l2-async-in-foreach: async in forEach/map does not await

- **id:** `ajr-l2-async-in-foreach`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** js-runnable  ·  **skills:** async, iteration, floating-promises

#### Learn

This one is not a performance bug, it is a correctness bug, and it is nastier because the code looks like it awaits and does not. Consider:

```js
items.forEach(async (x) => {
  await save(x);
});
console.log("done");
```

The intent is "save every item, then log done." What actually happens: `forEach` calls your callback for each item, the callback is `async` so it returns a promise, and `forEach` throws that return value away. `forEach` has no concept of promises and no way to wait. So the loop starts all the saves and returns immediately, `console.log("done")` runs at t=0 while the saves are still pending, and the saves resolve later in the background. The code after the loop runs before the work it was supposed to follow.

There is a second, worse problem. If `save(x)` rejects, that rejection lives inside a promise that nobody holds a reference to. It becomes a floating (unhandled) rejection. A surrounding `try/catch` around the `forEach` will not catch it, because the `forEach` call itself already returned successfully. The error surfaces as an "unhandled promise rejection" warning at best, and silently vanishes at worst.

There are two correct shapes, and you pick based on whether you need concurrency:

```js
// Serial: one at a time, with back-pressure. Use for ordered or rate-sensitive work.
for (const x of items) {
  await save(x);
}
console.log("done"); // runs only after every save resolves

// Parallel: all at once, then wait for all. Use for independent work.
await Promise.all(items.map((x) => save(x)));
console.log("done"); // also runs only after every save resolves
```

**Interview nuance:** the review tell is the literal token sequence "`.forEach(async`" (and the same for `.map(async ...)` or `.filter(async ...)` when the returned promise is never awaited). A `map` that returns promises is fine only if you feed the result to `Promise.all`; a bare `map(async ...)` whose array you ignore has the same defect as `forEach`.

The difference between the two fixes is back-pressure. `for-of` with `await` processes one item, waits for it to finish, then starts the next, so you never have more than one in flight. `Promise.all(map)` starts everything at once, which is faster for independent work but offers no back-pressure and can overwhelm a resource. For large collections against a limited resource, use the bounded pool from lesson one.

**Interview nuance:** `Array.prototype.forEach(async ...)` does not await each item, and no version of it ever will, because `forEach` returns `undefined` and ignores callback return values by design.

Recap: `async` callbacks in `forEach` are not awaited, so following code runs early and rejections float. Use `for-of` plus `await` for serial with back-pressure, or `await Promise.all(items.map(...))` for parallel.

#### See it live

**Demo (js-runnable):** `items.forEach(async x => { await save(x) }); log("done")` against `for-of` plus `await` and against `await Promise.all(items.map(save))`, logging when "done" prints relative to when the saves complete.

```js
function save(x) {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log("   saved", x, "at", Math.round(performance.now() - start) + "ms");
      resolve();
    }, 100);
  });
}
const items = [1, 2, 3];
let start;

async function run() {
  // A) forEach(async ...): does NOT await, "done" prints at ~0ms
  start = performance.now();
  console.log("A) forEach(async):");
  items.forEach(async (x) => {
    await save(x);
  });
  console.log("   done at", Math.round(performance.now() - start) + "ms (BEFORE the saves!)");

  await delay(400); // let A's stray saves finish before starting B

  // B) for-of + await: serial, "done" prints only after all saves
  start = performance.now();
  console.log("B) for-of + await:");
  for (const x of items) {
    await save(x);
  }
  console.log("   done at", Math.round(performance.now() - start) + "ms (after all saves, ~300ms)");

  // C) Promise.all(map): parallel, "done" prints after the slowest save
  start = performance.now();
  console.log("C) Promise.all(map):");
  await Promise.all(items.map((x) => save(x)));
  console.log("   done at", Math.round(performance.now() - start) + "ms (after all saves, ~100ms)");
}
function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
run();
```

**Watch:** in variant A, "done" prints at ~0ms and the three "saved" lines trickle in afterward at ~100ms, proving `forEach` did not wait. In variant B, "done" prints only after all three saves, at ~300ms, because each `await` blocks the loop (serial with back-pressure). In variant C, "done" prints at ~100ms because the saves overlap and `Promise.all` waits for the last one. Same three saves, three completely different timings for the line that follows the loop.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Fix `items.forEach(async x => { await save(x) }); log("done")` (it logs "done" too early) for serial and for parallel, and say when to use each.

**Think about:**
- Why does "done" log before the saves finish?
- What happens to a rejection thrown inside the async callback?
- Which shape gives back-pressure?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The serial fix uses `for-of` with `await`; the parallel fix uses `Promise.all` over `map`:

```js
// Serial: back-pressure, one at a time
for (const x of items) {
  await save(x);
}
console.log("done");

// Parallel: all at once, then wait
await Promise.all(items.map((x) => save(x)));
console.log("done");
```

Why "done" logs early at the runtime level: `forEach` invokes the callback for each item and ignores the return value. Your callback is `async`, so it returns a promise, but `forEach` neither collects nor awaits it. The whole `forEach` call is synchronous from the caller's view: it starts all three saves and returns `undefined` immediately, so `console.log("done")` runs in the same tick, long before any `save` resolves. There is nothing to await because the awaitable was discarded.

What happens to a rejection: it floats. The promise the callback returns is unreferenced, so if `save` rejects there is no `.catch` and no enclosing `await` to propagate it. A `try/catch` wrapped around the `forEach` will not see it, because `forEach` already returned normally. You get an unhandled rejection warning, and in many setups the error is effectively swallowed.

Which shape gives back-pressure: the `for-of` plus `await`. It processes one item, waits for it, then moves on, so at most one save is in flight and a slow or failing save naturally slows the loop. `Promise.all(map)` has no back-pressure; it launches everything at once, which is faster for independent work but can flood a database or API.

How to spot it in review: the token `.forEach(async` (also a bare `.map(async ...)` whose result is never passed to `Promise.all`). Production symptom: code after the loop runs before the loop's work is actually done (a response returns before writes commit, a "success" toast fires before saves land), plus intermittent errors that appear as unhandled rejections with no stack tied to your `try/catch`.

Common misconception to correct: `array.forEach(async ...)` does not await each item. `forEach` returns `undefined` and ignores callback returns by design, so it can never wait.

**Self-check rubric:**
- [ ] I explained "done" logs early because `forEach` discards the returned promise.
- [ ] I gave the serial fix (`for-of` + `await`) and the parallel fix (`await Promise.all(items.map(...))`).
- [ ] I noted rejections inside the async callback float and escape `try/catch` around the loop.
- [ ] I identified `for-of` + `await` as the one with back-pressure.
- [ ] I flagged the review tell `.forEach(async` (and bare `.map(async ...)`).

#### Practice: real-world variant (save, then reveal)

**Prompt:** Migration script that reports success too early. A one-off script runs `records.forEach(async (r) => { await db.write(transform(r)); }); console.log("migration complete");` over 50,000 records, then the CI job exits 0. Later you find some rows never wrote and the failures never surfaced. Rewrite it correctly, add error handling that actually fails the job, and bound the write concurrency to protect the database.

**Model answer (revealed on demand):**

The script has all three symptoms of the `forEach(async ...)` bug at once: "migration complete" and the process exit happen before the writes finish, failed writes float as unhandled rejections, and 50,000 simultaneous writes would swamp the connection pool anyway. The fix is a bounded, awaited loop that collects failures:

```js
async function mapWithConcurrency(items, limit, fn) {
  const errors = [];
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      try {
        await fn(items[i]);
      } catch (err) {
        errors.push({ index: i, err });
      }
    }
  }
  await Promise.all(Array.from({ length: limit }, () => worker()));
  return errors;
}

const errors = await mapWithConcurrency(records, 20, (r) => db.write(transform(r)));
if (errors.length) {
  console.error(`migration FAILED: ${errors.length} of ${records.length} writes failed`);
  process.exit(1); // fail the CI job for real
}
console.log("migration complete:", records.length, "records");
```

Why this is correct where `forEach` was not: every write is actually awaited inside a worker, so `mapWithConcurrency` does not resolve until all 50,000 are done, and "migration complete" and `process.exit` run only after the real work finishes. Errors are caught per item and collected instead of floating, so a failed write cannot vanish, and the non-zero exit makes CI red instead of falsely green. The pool of 20 workers keeps at most 20 writes in flight, giving back-pressure that protects the database connection pool where a raw `Promise.all` over 50,000 promises would exhaust connections and spike memory.

How to spot the class of bug in review: any `.forEach(async` in a script whose exit code or "done" log is meant to mean the work completed. Production symptom: a migration or batch job that reports success while silently dropping a fraction of its work, discovered days later as missing rows, with no error trail because the rejections were never awaited. Misconception to correct: adding `async/await` inside the callback does not make `forEach` wait or propagate errors. The `async` keyword only changes the callback's return type to a promise that `forEach` then ignores.

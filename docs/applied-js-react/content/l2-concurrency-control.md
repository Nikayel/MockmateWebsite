> Module **2.3** (Concurrency Control) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [2.2](./l2-promise-combinators.md) · Next: [2.4](./l2-cancellation-errors.md)

# L2 · Concurrency Control

`Promise.all` is not a scheduler. It starts every promise you hand it at once and only waits for them to finish, so fanning it out over a large array opens that many operations simultaneously. After this module you can catch the review comment that matters most in async code, "this map goes straight into `Promise.all` with no cap," predict the production failures it causes (429s, exhausted sockets, OOM, event-loop stalls), and write a bounded concurrency pool that keeps exactly N operations in flight while draining a queue.

### ajr-l2-bounded-concurrency-pool: Bounded concurrency (a promise pool)

- **id:** `ajr-l2-bounded-concurrency-pool`  ·  **difficulty:** hard  ·  **est:** 16 min  ·  **demo:** js-runnable  ·  **skills:** concurrency, pool, rate-limits

#### Learn

When you have 1000 ids to process and each one calls an API, you have three options, and only one of them is right. Option one is sequential: `for` loop with `await`, one at a time. Correct but slow, because you pay the full latency of every call end to end. Option two is unbounded fan-out: `Promise.all(ids.map(callApi))`. Fast in a microbenchmark, catastrophic in production, because it opens 1000 connections in the same tick. Option three is a bounded pool: keep at most N in flight, and the moment one finishes, pull the next id off a queue and start it.

The naive middle ground people reach for is fixed-batch chunking: slice the array into groups of N, `await Promise.all` on each group, then move to the next group. This bounds concurrency, but badly. Each batch can only advance as fast as its slowest member. If batch one has 4 quick calls and 1 that takes 3 seconds, the other 4 slots sit idle for 3 seconds waiting for the batch barrier before batch two even starts. You get sawtooth utilization: full, then draining to one straggler, then full again.

A sliding pool has no barrier. It maintains a shared cursor into the input and runs N independent "workers." Each worker loops: take the next index, await the task, repeat, until the input is exhausted. A fast task frees its slot immediately and the worker grabs more work while a slow task elsewhere is still running. Utilization stays pinned at N.

```js
async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;          // claim an index synchronously
      results[index] = await fn(items[index], index);
    }
  }
  const size = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: size }, worker));
  return results;
}
```

The trick is `const index = cursor++`. Incrementing the cursor is synchronous, so no two workers can claim the same index even though they interleave at every `await`. Each worker only touches the slot it claimed, so `results` stays ordered without a lock.

What sets the right limit? Not "as high as possible." The ceiling is the tightest downstream constraint: the API's rate limit (requests per second), the database connection pool size, the browser's per-origin socket cap (6 in HTTP/1.1), or your own memory budget for buffered responses. Pick the limit that saturates that constraint without breaching it. Past that point, more concurrency does not add throughput; it just adds queueing, contention, and error rates.

**Interview nuance:** if the interviewer asks "why not just use `Promise.all`," the answer they want is that `Promise.all` is a combinator, not a limiter. It controls *waiting*, not *starting*. Bounding fan-out is a separate concern that needs its own primitive, whether that is your own pool or a library like `p-limit`.

Recap: sequential wastes time, unbounded fan-out breaks things, fixed batches stall on stragglers. A sliding pool with a shared cursor holds exactly N in flight and stays pinned at N until the queue drains.

#### See it live

**Demo (js-runnable):** runs `mapWithConcurrency(items, limit, fn)` over 60 mock tasks at limit 5, tracking the peak number in flight, and contrasts it against fixed-batch chunking so you can see the pool stay pinned while batching sawtooths.

```js
// Compare a sliding pool vs fixed-batch chunking over 60 tasks.
// Mock async work: random duration so stragglers appear.
function makeTasks(n) {
  return Array.from({ length: n }, (_, i) => i);
}
function work(id) {
  const ms = 20 + (id * 37) % 120;   // deterministic pseudo-random 20..139ms
  return new Promise((res) => setTimeout(() => res(id), ms));
}

// Instrumentation: track how many are in flight right now.
let inFlight = 0;
let peak = 0;
function instrumented(fn) {
  return async (x, i) => {
    inFlight++; peak = Math.max(peak, inFlight);
    try { return await fn(x, i); } finally { inFlight--; }
  };
}

// A) Sliding pool: at most `limit` in flight, no barrier.
async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index], index);
    }
  }
  const size = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: size }, worker));
  return results;
}

// B) Fixed-batch chunking: Promise.all one group of `limit` at a time.
async function mapInBatches(items, limit, fn) {
  const results = [];
  for (let i = 0; i < items.length; i += limit) {
    const slice = items.slice(i, i + limit);
    const done = await Promise.all(slice.map((x, j) => fn(x, i + j)));
    results.push(...done);
  }
  return results;
}

(async () => {
  const items = makeTasks(60);

  peak = 0; inFlight = 0;
  let t = performance.now();
  await mapWithConcurrency(items, 5, instrumented(work));
  console.log('A) pool     limit=5  peak in-flight =', peak,
              ' wall =', Math.round(performance.now() - t), 'ms');

  peak = 0; inFlight = 0;
  t = performance.now();
  await mapInBatches(items, 5, instrumented(work));
  console.log('B) batches  limit=5  peak in-flight =', peak,
              ' wall =', Math.round(performance.now() - t), 'ms');
})();
```

**Watch:** both variants report a peak in-flight of exactly 5, so both bound concurrency. The difference is wall-clock time: the pool finishes noticeably faster because it never idles waiting on a batch barrier. The batch version leaves slots empty every time a group is stuck on its slowest straggler, so its total time is the sum of each batch's *slowest* task, while the pool's time tracks continuous saturation. That proves the cap holds and that a sliding pool beats fixed batches at the same limit.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Write `mapWithConcurrency(items, limit, fn)` that keeps at most `limit` promises in flight, then use it to process 1000 ids at concurrency 5. Explain why a shared cursor keeps the workers from colliding.

**Think about:**
- Why is naive fixed-batch chunking worse than a sliding pool?
- What determines the right limit?
- Where do rate limits and connection caps come in?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

```js
async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;                 // claim atomically (sync)
      results[index] = await fn(items[index], index);
    }
  }
  const size = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: size }, worker));
  return results;
}

// Process 1000 ids, never more than 5 requests open at once.
const ids = Array.from({ length: 1000 }, (_, i) => i);
const results = await mapWithConcurrency(ids, 5, (id) => fetchUser(id));
```

Mechanism: `Promise.all` alone is unbounded because every promise in the array is already *started* the moment `.map` runs; `Promise.all` only decides when to resume. The pool inverts that. It starts exactly `size` workers, and each worker starts the next task only when its previous `await` resolves, so a slot is never occupied by more than one task. `cursor++` runs synchronously between `await` points, so even though the workers interleave, no two ever read the same value of `cursor`, which is why you do not need a lock and why `results` stays index-aligned with `items`.

Why fixed batches are worse: a batch is a barrier. `await Promise.all(group)` cannot start the next group until the current group's *slowest* member resolves, so fast slots sit idle waiting on one straggler. The pool has no barrier, so a freed slot immediately claims new work and utilization stays pinned at the limit.

How to spot it in review: look for `Promise.all(arr.map(callApi))` where `arr` length is unbounded or user-controlled, and for chunk-then-`Promise.all` loops (they cap concurrency but stall on stragglers). Both should become a pool or `p-limit(n)`.

Production symptom: without a cap you get 429 rate-limit responses, socket or DB connection-pool exhaustion, event-loop stalls, and OOM from thousands of buffered in-flight responses. Choose the limit from the tightest downstream constraint (API rate limit, pool size, the 6-per-origin browser socket cap), not from "make it big."

Common misconception: "higher concurrency is always faster." Past the point where you saturate the bottleneck, extra concurrency only adds queueing and error rate; throughput plateaus or drops.

**Self-check rubric:**
- [ ] At most `limit` calls are ever in flight (verified by an in-flight counter, peak equals limit).
- [ ] `results` is index-aligned with `items` (order preserved despite interleaving).
- [ ] The next task starts as a slot frees, not on a batch boundary.
- [ ] `limit` is clamped to at least 1 and at most `items.length`.
- [ ] You can name what sets the ceiling (rate limit / pool size / socket cap).
- [ ] You explain why `cursor++` needs no lock (it is synchronous between awaits).

#### Practice: real-world variant (save, then reveal)

**Prompt:** Nightly reconciliation job. You must call a payments provider once per transaction for 200,000 transactions. The provider allows 50 requests per second and returns `429` with a `Retry-After` header when you exceed it, and any request can transiently fail. Extend your pool so it respects the rate limit, retries failures with backoff and jitter, and collects per-item outcomes without letting one bad id abort the run.

**Model answer (revealed on demand):**

Two constraints stack here: a *concurrency* cap (how many are open at once) and a *rate* cap (how many you start per second). A pool alone handles the first, not the second. At 50 req/s with, say, 200ms average latency you only need about 10 concurrent slots to saturate the limit (`rate * latency`), so set `limit` around 10 and add a token/pacing gate so workers do not start faster than 50/s.

```js
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withRetry(fn, { tries = 5, base = 200 } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      return { ok: true, value: await fn() };
    } catch (err) {
      const retryAfter = err.retryAfterMs;                 // honor 429 header
      if (attempt >= tries - 1) return { ok: false, err };
      const backoff = retryAfter ?? base * 2 ** attempt;   // exponential
      const jitter = Math.random() * backoff * 0.5;        // decorrelate
      await sleep(backoff + jitter);
    }
  }
}

async function reconcile(txns, { limit = 10, ratePerSec = 50 }) {
  const results = new Array(txns.length);
  let cursor = 0;
  let nextSlot = performance.now();
  const gap = 1000 / ratePerSec;                           // 20ms between starts
  async function worker() {
    while (cursor < txns.length) {
      const i = cursor++;
      const now = performance.now();
      const wait = Math.max(0, nextSlot - now);
      nextSlot = Math.max(now, nextSlot) + gap;            // reserve a start slot
      if (wait) await sleep(wait);
      results[i] = await withRetry(() => callProvider(txns[i]));
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return results;                                          // per-item {ok,...}
}
```

Mechanism: the shared `nextSlot` clock spaces out *starts* to `1000/ratePerSec` ms apart regardless of how many workers exist, so you never breach 50/s even at peak concurrency. Wrapping each call in `withRetry` means a transient failure or a `429` retries the single item instead of rejecting, so one bad id cannot abort the whole run (the opposite of raw `Promise.all`, where the first rejection abandons everything). Jitter matters at scale: without it, everyone who got throttled retries at the same instant and you self-inflict a thundering-herd 429 storm. Returning `{ ok, value | err }` per item lets you tally successes and dead-letter the failures instead of throwing away 199,999 good results because one failed. Production symptom if you skip the rate gate: steady 429s that turn into ever-longer backoff, so effective throughput collapses below the sequential baseline.

### ajr-l2-unbounded-fanout: Unbounded fan-out blows up

- **id:** `ajr-l2-unbounded-fanout`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** js-runnable  ·  **skills:** concurrency, rate-limits

#### Learn

`await Promise.all(ids.map((id) => fetch(url(id))))` reads like "fetch all of these and wait." What it actually does is call `fetch` for every id *before* the `await` even runs. `.map` is synchronous: it walks the whole array in one tick, and each `fetch(...)` call kicks off a real network request immediately and returns a pending promise. So by the time `Promise.all` receives the array, all N requests are already open. `Promise.all` never throttled anything; it just waits.

With 10 ids that is fine. With 10,000 ids you have asked the runtime to open 10,000 connections in the same synchronous burst. That collides with every downstream limit at once:

- **Browser per-origin cap.** Browsers allow only about 6 concurrent HTTP/1.1 connections per origin. The other 9,994 requests do not fail, they queue in the browser's connection pool, so you also lose the visibility you thought parallelism bought you.
- **Server and gateway rate limits.** The requests that do go out arrive as a spike and trip `429 Too Many Requests` or get shed by a load balancer.
- **Sockets and memory.** In Node there is no 6-connection cap, so you really can open thousands of sockets, exhaust file descriptors or the upstream DB pool, and hold thousands of in-flight response buffers in memory at once, which is a classic OOM.
- **Event-loop pressure.** Ten thousand promise reactions resolving in a burst floods the microtask queue and stalls everything else.

The minimal fix is to bound how many start at once. You do not need to rewrite the logic, only cap the fan-out with a pool or a small limiter:

```js
// Before: opens 10,000 connections in one tick.
const all = await Promise.all(ids.map((id) => fetch(url(id))));

// After: at most 5 open at any moment.
const all = await mapWithConcurrency(ids, 5, (id) => fetch(url(id)));
// or with a library:  const limit = pLimit(5);
//                     await Promise.all(ids.map((id) => limit(() => fetch(url(id)))));
```

Note that `pLimit(5)` works precisely because it wraps each call in a function and defers *invoking* `fetch` until a slot is free. The distinction is everything: `ids.map((id) => fetch(url(id)))` starts now; `ids.map((id) => limit(() => fetch(url(id))))` starts later, under the cap.

**Interview nuance:** the giveaway phrase is "Promise.all self-throttles" or "Promise.all runs them in parallel batches." It does neither. It is a synchronization point over already-started work. Parallelism is decided by *how and when you start the promises*, and `Promise.all` is downstream of that decision.

Recap: `.map` starts every request synchronously, so `Promise.all` over a huge array opens a huge burst of connections. It hits the browser's 6-per-origin cap, server rate limits, socket and memory ceilings, and floods the event loop. Cap the fan-out with a pool or a limiter that defers the call until a slot frees.

#### See it live

**Demo (js-runnable):** runs a mock 10,000-id fan-out through `Promise.all(map)` versus a pool of 5, both instrumented with an in-flight gauge, and prints peak concurrency for each.

```js
// Mock "fetch": resolves after a short delay. Instrumented to
// count how many are open at once, since we cannot open real sockets here.
let inFlight = 0, peak = 0;
function mockFetch(id) {
  inFlight++; peak = Math.max(peak, inFlight);
  return new Promise((res) => setTimeout(() => { inFlight--; res(id); },
                                          10 + (id % 5) * 5));
}

// Sliding pool from the previous lesson.
async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return results;
}

(async () => {
  const ids = Array.from({ length: 10000 }, (_, i) => i);

  // A) Unbounded fan-out: every mockFetch starts in this one tick.
  inFlight = 0; peak = 0;
  let t = performance.now();
  await Promise.all(ids.map((id) => mockFetch(id)));
  console.log('A) Promise.all(map)  peak in-flight =', peak,
              ' wall =', Math.round(performance.now() - t), 'ms');

  // B) Bounded pool of 5.
  inFlight = 0; peak = 0;
  t = performance.now();
  await mapWithConcurrency(ids, 5, (id) => mockFetch(id));
  console.log('B) pool of 5         peak in-flight =', peak,
              ' wall =', Math.round(performance.now() - t), 'ms');
})();
```

**Watch:** variant A reports a peak in-flight of 10,000, the gauge spikes off the chart in a single tick because `.map` started every request before the `await`. Variant B holds a flat peak of exactly 5. This is a faithful model of the *starting* behavior (the number opened per tick); it is not opening real sockets, so it cannot show the actual 429s, socket exhaustion, or OOM, only the concurrency count that causes them. That count is the whole point: 10,000 versus 5 open at once is the difference between a rate-limit incident and a healthy run.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Explain exactly what breaks when you `await Promise.all(tenThousandIds.map((id) => fetch(url(id))))`, then bound it with the minimal change. Be specific about *when* the requests start.

**Think about:**
- What downstream limits does unbounded fan-out hit?
- What is the browser per-origin connection cap?
- What is the minimal fix?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

```js
// Broken: 10,000 fetches all start in one synchronous tick.
const data = await Promise.all(tenThousandIds.map((id) => fetch(url(id))));

// Minimal fix: cap the fan-out so at most N start at a time.
const limit = pLimit(5);
const data = await Promise.all(
  tenThousandIds.map((id) => limit(() => fetch(url(id)))),
);
// or: const data = await mapWithConcurrency(tenThousandIds, 5, (id) => fetch(url(id)));
```

Mechanism: `.map` is synchronous and `fetch(url(id))` starts the request the instant it is called, so the map expression opens all 10,000 connections in the same tick, before `Promise.all` runs. `Promise.all` is a combinator over already-pending promises; it decides when your code *resumes*, not how many operations *start*. That is why the fix has to change the starting behavior: `limit(() => fetch(...))` passes a *function*, and the limiter defers calling it until a slot frees, so only 5 are ever open.

How to spot it in review: an array whose length is unbounded or user-controlled mapped straight into `Promise.all` with a side-effecting call (`fetch`, `db.query`, `s3.putObject`) inside the map. If the call is invoked eagerly (`.map((x) => call(x))`) rather than deferred (`.map((x) => limit(() => call(x)))`), it is unbounded.

Production symptom: in the browser, only ~6 connections per origin actually go out (HTTP/1.1), the rest queue invisibly, and the server sees a spike that returns `429 Too Many Requests` or gets shed by the load balancer. In Node there is no 6-connection cap, so you exhaust sockets or file descriptors, drain the upstream DB connection pool, buffer thousands of responses into an OOM, and flood the microtask queue so the event loop stalls.

Common misconception: "Promise.all self-throttles" or "Promise.all runs them in batches." It does neither. Concurrency is set entirely by how many promises you start; `Promise.all` only awaits them. Bounding fan-out is a separate primitive.

**Self-check rubric:**
- [ ] You state that `.map` starts every `fetch` synchronously, before the `await`.
- [ ] You name the browser's ~6-per-origin HTTP/1.1 cap.
- [ ] You name at least two downstream failures (429, socket/FD exhaustion, DB pool, OOM, event-loop stall).
- [ ] The fix defers the call (`limit(() => fetch())`) rather than invoking it eagerly.
- [ ] You explain why `Promise.all` cannot be the throttle.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Image-processing microservice. A webhook hands you an array of image URLs (client-supplied, sometimes 20, sometimes 40,000) and you download and thumbnail each one. The current handler is `await Promise.all(urls.map((u) => downloadAndResize(u)))` and it periodically OOM-kills the pod and trips the storage provider's rate limiter. Diagnose why the failure is *load-dependent* and correct it so the same code path survives both a 20-url and a 40,000-url payload.

**Model answer (revealed on demand):**

The failure is load-dependent because concurrency here equals *input length*. With 20 urls you open 20 downloads, trivial. With 40,000 urls the same line opens 40,000 downloads in one tick, each holding an image buffer in memory and a socket to the storage provider. Peak memory is roughly `payloadLength * avgImageSize`, which is unbounded because the payload is client-controlled, so a large enough request OOM-kills the pod, and the simultaneous request spike trips the provider's rate limit. Nothing is wrong with `downloadAndResize`; the bug is that fan-out scales 1:1 with untrusted input.

```js
async function handleWebhook(urls) {
  if (urls.length > MAX_BATCH) {                       // reject absurd payloads
    throw new BadRequest(`too many urls: ${urls.length}`);
  }
  const outcomes = await mapWithConcurrency(urls, 8, async (u) => {
    try {
      return { ok: true, url: u, key: await downloadAndResize(u) };
    } catch (err) {
      return { ok: false, url: u, err: String(err) };  // isolate one bad url
    }
  });
  return {
    processed: outcomes.filter((o) => o.ok).length,
    failed: outcomes.filter((o) => !o.ok),
  };
}
```

Mechanism: capping at 8 makes peak memory `8 * avgImageSize` regardless of whether the payload is 20 or 40,000, so the pod's footprint is flat and predictable, and the outbound request rate stays under the provider's limit. Choose the cap from the tightest constraint, here the pod's memory budget divided by max image size, not from a guess. Two extra safeguards matter at this scale: an explicit `MAX_BATCH` guard so a malicious or buggy client cannot queue an unbounded job, and per-item error isolation so one corrupt image returns `{ ok: false }` instead of rejecting the whole `Promise.all` and discarding 39,999 good thumbnails. Production symptom you are eliminating: the sawtooth memory graph that ends in an OOMKill event and the correlated 429 spikes from the storage provider, both of which appear only above a payload-size threshold, which is the tell that fan-out is tied to input length.

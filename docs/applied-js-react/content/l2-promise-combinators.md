> Module **2.2** (Promise Combinators & Partial Failure) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [2.1](./l2-waterfalls-parallelism.md) · Next: [2.3](./l2-concurrency-control.md)

# L2 · Promise Combinators & Partial Failure

After this module you will catch the combinator bugs that turn one flaky call into a blank page: a dashboard that wraps five independent widgets in `Promise.all` and loses all four successes when the fifth rejects, a "partial success" screen that never renders because `allSettled` was the tool it needed, and a timeout or "fastest mirror" that quietly picks the wrong combinator so a fast rejection wins. You will know exactly what each of `all`, `allSettled`, `race`, and `any` does on the first settlement, and that none of them cancel the promises that lost.

### ajr-l2-all-fail-fast: Promise.all is fail-fast and does not cancel the losers

- **id:** `ajr-l2-all-fail-fast`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** js-runnable  ·  **skills:** promises, error-handling, combinators

#### Learn

`Promise.all(iterable)` gives you a single promise that fulfills with an array of every input's value, in input order, once they have all fulfilled. That is the happy path everyone remembers. The part that bites in production is the failure path: `Promise.all` is fail-fast. The moment any input promise rejects, the promise `all` returned rejects immediately, with that first rejection reason, and every value that already fulfilled is thrown away. You do not get "four out of five widgets." You get one rejection reason and nothing else.

Here is the shape that goes wrong on a dashboard:

```js
async function loadDashboard() {
  const [profile, feed, billing, notifs, ads] = await Promise.all([
    fetchProfile(),   // 20ms  ok
    fetchFeed(),      // 30ms  ok
    fetchBilling(),   // 50ms  REJECTS (billing service 500s)
    fetchNotifs(),    // 80ms  ok
    fetchAds(),       // 90ms  ok
  ]);
  render({ profile, feed, billing, notifs, ads });
}
```

When `fetchBilling()` rejects at 50ms, the `await` throws at 50ms, `render` never runs, and all five destructured values are lost, including the four that were fine. The user sees a blank page (or your catch-all error boundary) because one non-critical widget failed.

Now the second, subtler half: `Promise.all` does not cancel the other promises. Promises are not cancellable by rejecting a combinator. `fetchNotifs()` and `fetchAds()` were already in flight when billing rejected, and they keep running to completion at 80ms and 90ms. Their `.then` callbacks still fire, their responses still arrive, any side effects they trigger still happen. `all` simply stopped listening. If those requests are expensive or hold connections, you are now leaking work for a screen you already abandoned.

**Interview nuance:** "fail-fast" describes *when the combinator settles*, not *what happens to the inputs*. The inputs are ordinary promises with their own independent lifecycles. The only way to actually stop the losers is to pass each fetch an `AbortController` signal and call `controller.abort()` in your catch. Combinators route settlements; they never reach back and cancel work.

The fix depends on intent. If partial data is acceptable (the usual dashboard case), use `Promise.allSettled` so one widget's failure becomes one widget's error tile. If you genuinely want all-or-nothing but also want to stop wasted work on failure, keep `Promise.all` and wire an `AbortController` so the catch aborts the siblings.

Recap: `Promise.all` fulfills with all values in order but rejects on the first rejection and discards the successes; the sibling promises are not cancelled and keep running; reach for `allSettled` for partial success, and add an `AbortController` if you actually need the losers to stop.

#### See it live

**Demo (js-runnable):** fires 5 tasks where task #3 rejects at 50ms under `Promise.all`, and logs a timeline so you can watch `all` reject at 50ms while tasks #4 and #5 keep finishing afterward.

```js
// Deterministic mock of 5 independent requests under Promise.all.
// Task #3 rejects at 50ms; #4 and #5 finish LATER, proving they were not cancelled.
const t0 = performance.now();
const at = () => (performance.now() - t0).toFixed(0).padStart(3, " ");

function task(name, ms, { reject = false } = {}) {
  return new Promise((resolve, rej) => {
    setTimeout(() => {
      // This line fires whether or not the combinator is still listening.
      console.log(`[${at()}ms] task ${name} SETTLED (${reject ? "reject" : "resolve"})`);
      reject ? rej(new Error(`${name} failed`)) : resolve(name);
    }, ms);
  });
}

const tasks = [
  task("#1", 20),
  task("#2", 30),
  task("#3", 50, { reject: true }),
  task("#4", 80),
  task("#5", 90),
];

console.log(`[${at()}ms] awaiting Promise.all of 5 tasks`);
Promise.all(tasks)
  .then((values) => console.log(`[${at()}ms] all FULFILLED with`, values))
  .catch((err) => console.log(`[${at()}ms] all REJECTED with: ${err.message}  <-- page would blank here`));

// Keep the process alive long enough to observe the losers finishing.
setTimeout(() => console.log(`[${at()}ms] --- note: #4 and #5 logged AFTER the rejection ---`), 120);
```

**Watch:** the `all REJECTED` line prints at about 50ms (when #3 rejects), and then task #4 (80ms) and task #5 (90ms) still print their own `SETTLED` lines *after* that rejection. That ordering is the proof: the combinator gave up at 50ms, but the sibling promises kept running to completion and were never cancelled. The four successful values are simply gone from `all`'s result.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Explain the fail-fast behavior in this dashboard and describe what happens to the in-flight requests. A dashboard loads 5 widgets with `await Promise.all([...])` and one widget's endpoint returns a 500, which blanks all five widgets. Say why the whole page goes blank and what happens to the other four requests that were already fired.

**Think about:**
- What does `Promise.all` do on the first rejection?
- Are the successful values kept?
- Do the sibling promises get cancelled?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

`Promise.all` is fail-fast: the instant one input rejects, the awaited promise rejects with that reason, so the `await` throws before `render` is reached and every destructured value, including the four that fulfilled, is discarded. That is why one 500 blanks the entire page. Separately, the other four requests are not cancelled. They were already in flight, so they run to completion and their responses arrive into a screen that has already been abandoned, which is a wasted-work (and potentially connection) leak.

The fix for a dashboard, where partial data is fine, is `allSettled`:

```js
async function loadDashboard() {
  const results = await Promise.allSettled([
    fetchProfile(), fetchFeed(), fetchBilling(), fetchNotifs(), fetchAds(),
  ]);
  const widgets = ["profile", "feed", "billing", "notifs", "ads"];
  render(results.map((r, i) => ({
    name: widgets[i],
    ok: r.status === "fulfilled",
    value: r.status === "fulfilled" ? r.value : undefined,
    error: r.status === "rejected" ? r.reason : undefined,
  })));
}
```

Now a billing 500 becomes one error tile and the other four widgets render. If you actually need all-or-nothing but want to stop the wasted work, keep `Promise.all` but thread an `AbortController` signal into each fetch and call `controller.abort()` in the catch.

Mechanism: `Promise.all` settles as reject on the first input rejection and never collects the remaining values; the inputs are independent promises the combinator no longer listens to.

How to spot it in review: a `Promise.all` wrapping calls that can each fail independently and where partial data would still be useful. That is the smell. All-or-nothing `Promise.all` is correct only when a single failure genuinely should void the whole operation (for example, a transactional write set).

Production symptom: one flaky or slow-to-fail dependency blanks the whole page, and your logs show the "cancelled" requests still completing.

Common misconception: that `Promise.all` cancels the other promises when one rejects. It does not. Rejecting a combinator has no cancellation semantics; only an `AbortController` (or equivalent) can stop the underlying work.

**Self-check rubric:**
- [ ] I said `Promise.all` rejects with the first rejection reason, not a partial array.
- [ ] I stated the four successful values are discarded.
- [ ] I said the sibling requests keep running and are not cancelled.
- [ ] My fix uses `allSettled` (or `all` + `AbortController`) and I justified which.
- [ ] I named the production symptom (whole page blanks from one failure).

#### Practice: real-world variant (save, then reveal)

**Prompt:** Diagnose the "checkout page hammering a rate limit" incident. A checkout page fires `Promise.all([reservePayment(), reserveInventory(), fetchShippingQuotes()])`. `fetchShippingQuotes()` rejects quickly on a bad ZIP, but your monitoring shows `reservePayment` and `reserveInventory` still succeed on the backend, sometimes double-charging a retrying user. Explain the mechanism and give a fix that both renders a usable error and stops the payment side effect.

**Model answer (revealed on demand):**

Two things are happening. First, fail-fast: the fast rejection from `fetchShippingQuotes()` rejects the `all` at once, so the page shows a generic error and the user retries. Second, no cancellation: `reservePayment()` and `reserveInventory()` were already in flight and run to completion server-side, so a reservation (and a charge) lands even though the UI reported failure. On retry, a second `reservePayment()` fires, and now you have the double-charge.

The correct design separates "settle the UI" from "control the side effect." Payment is a write with side effects, so it must be cancellable and idempotent, not just wrapped in a combinator:

```js
const controller = new AbortController();
try {
  const [payment, inventory, shipping] = await Promise.all([
    reservePayment({ idempotencyKey, signal: controller.signal }),
    reserveInventory({ signal: controller.signal }),
    fetchShippingQuotes({ zip, signal: controller.signal }),
  ]);
  showCheckout({ payment, inventory, shipping });
} catch (err) {
  controller.abort();            // stop the in-flight siblings
  showError(err);                // one readable error, not a blank page
}
```

Two mechanisms matter here. `controller.abort()` is what actually stops the payment and inventory requests, because rejecting `all` never would. The `idempotencyKey` is what makes the retry safe: even if a charge did partially land before the abort, the second attempt with the same key is deduplicated by the payment provider rather than charging twice. If shipping quotes are non-critical, the stronger design also moves them out of the all-or-nothing set (fetch them with `allSettled` or lazily) so a bad ZIP never touches the payment path at all.

Spot in review: any `Promise.all` that mixes a cheap, frequently-failing read (shipping quotes) with expensive writes that have side effects (payment). The blast radius of the cheap failure is the whole set. Production symptom: duplicate charges or double-reserved inventory correlated with client-side retries after a fast unrelated error.

**Self-check rubric:**
- [ ] I explained fail-fast rejecting the UI plus non-cancellation letting the writes land.
- [ ] My fix uses `AbortController` to stop the siblings, not just a combinator swap.
- [ ] I added an idempotency key to make the retry safe.
- [ ] I flagged mixing side-effecting writes with a cheap failing read as the review smell.

### ajr-l2-allsettled-partial: allSettled for partial success

- **id:** `ajr-l2-allsettled-partial`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** js-runnable  ·  **skills:** promises, combinators

#### Learn

`Promise.allSettled(iterable)` is the combinator built for the case `Promise.all` handles badly: independent tasks where one failure should not void the others. It waits for every input to settle (fulfill or reject), and then it fulfills. It never rejects. That last sentence is the whole point: you never wrap `allSettled` in a `try/catch` for the combinator itself, because there is nothing for it to throw.

Instead of a bare array of values, `allSettled` resolves to a same-length, same-order array of tagged result objects. Each element is a discriminated union:

```js
// fulfilled result:
{ status: "fulfilled", value: <resolved value> }
// rejected result:
{ status: "rejected", reason: <rejection reason> }
```

The `status` field is the discriminant. You branch on it, and TypeScript narrows `value` vs `reason` accordingly. Because the array is the same length as the input and in the same order, index `i` of the results maps to input `i`. That is how you preserve "which widget did this outcome come from": you zip the results back against your list of widget names by index. You do not lose the correspondence the way you would if you filtered failures out first.

Here is the dashboard rewritten so one widget failing produces one error tile instead of a blank page:

```js
async function loadDashboard() {
  const names = ["profile", "feed", "billing", "notifs", "ads"];
  const results = await Promise.allSettled([
    fetchProfile(), fetchFeed(), fetchBilling(), fetchNotifs(), fetchAds(),
  ]);
  return results.map((r, i) =>
    r.status === "fulfilled"
      ? { name: names[i], ok: true, data: r.value }
      : { name: names[i], ok: false, error: r.reason }
  );
}
```

Every widget renders something. The four healthy ones show data; billing shows a local error tile with a retry button. No global catch, no blank screen.

**Interview nuance:** `allSettled` resolves only after the *slowest* input settles, because it waits for all of them. So it does not make anything faster, and it does not shorten your tail latency. It changes failure *semantics*, not timing. If your real problem is one slow widget holding up the rest, that is a rendering/streaming concern (render each promise as it settles), not something `allSettled` solves. Reaching for `allSettled` to "speed up" a dashboard is a category error.

One more sharp edge: because `allSettled` swallows all rejections into result objects, unhandled errors become easy to ignore. A rejected result is still an error you are responsible for surfacing (a tile, a log, a metric). "It didn't throw" is not "it succeeded."

Recap: `allSettled` waits for all inputs, never rejects, and returns a same-length, same-order array of `{status, value}` or `{status, reason}` objects; branch on `status`, zip back by index to preserve which input each result belongs to, and remember it changes failure handling, not latency.

#### See it live

**Demo (js-runnable):** runs the same 5 tasks with #3 rejecting, but under `Promise.allSettled`, and logs each result as a "tile" showing its status and value/reason so you can see 4 fulfilled + 1 rejected all arrive together.

```js
// Same 5 tasks as before, now under allSettled: it NEVER rejects and returns
// a same-length tagged array. Task #3 rejects; the other 4 still come back.
const t0 = performance.now();
const at = () => (performance.now() - t0).toFixed(0).padStart(3, " ");

function task(name, ms, { reject = false } = {}) {
  return new Promise((resolve, rej) => {
    setTimeout(() => reject ? rej(new Error(`${name} failed`)) : resolve(`${name}-data`), ms);
  });
}

const names = ["#1", "#2", "#3", "#4", "#5"];
const tasks = [
  task("#1", 20),
  task("#2", 30),
  task("#3", 50, { reject: true }),
  task("#4", 80),
  task("#5", 90),
];

console.log(`[${at()}ms] awaiting Promise.allSettled`);
Promise.allSettled(tasks).then((results) => {
  console.log(`[${at()}ms] allSettled FULFILLED (it never rejects). Rendering tiles:`);
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      console.log(`  [tile ${names[i]}] GREEN  status=${r.status}  value=${r.value}`);
    } else {
      console.log(`  [tile ${names[i]}] RED    status=${r.status}  reason=${r.reason.message}`);
    }
  });
});
```

**Watch:** the whole thing resolves once, at about 90ms (the slowest task), and prints five tiles: four GREEN with their values and one RED for #3 with its reason. The `.then` runs and there is no `.catch`, which is the visible proof that `allSettled` fulfilled rather than rejected. Compare it mentally to the previous lesson's demo: same failure, but here the four successes survive as tiles instead of vanishing.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Convert the fail-fast dashboard to `Promise.allSettled` and render per-widget success/error tiles from the `{status, value, reason}` results. Show the code that maps the settled results to tiles, and explain how you keep each result attached to the right widget and why this version never needs a `try/catch` around the combinator.

**Think about:**
- What is the shape of each result?
- Does `allSettled` ever reject?
- How do you preserve which input each result came from?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

Each element of the resolved array is a tagged object: `{ status: "fulfilled", value }` for a success or `{ status: "rejected", reason }` for a failure. `status` is the discriminant you branch on. The array is the same length and in the same order as the inputs, so you preserve "which widget" by mapping over it with the index and zipping against a parallel `names` array.

```js
async function loadDashboard() {
  const names = ["profile", "feed", "billing", "notifs", "ads"];
  const results = await Promise.allSettled([
    fetchProfile(), fetchFeed(), fetchBilling(), fetchNotifs(), fetchAds(),
  ]);
  return results.map((r, i) =>
    r.status === "fulfilled"
      ? { name: names[i], ok: true, data: r.value }
      : { name: names[i], ok: false, error: String(r.reason?.message ?? r.reason) }
  );
}

// Rendering:
tiles.map((t) => t.ok ? <WidgetTile name={t.name} data={t.data} />
                      : <ErrorTile name={t.name} message={t.error} onRetry={...} />);
```

Mechanism: `allSettled` waits for every input to settle and then fulfills with the tagged array; it never rejects, so wrapping it in `try/catch` for the combinator is dead code. Each rejection is captured as a `reason` on its result object rather than propagating out.

How to spot the original in review: `Promise.all` used in a place where partial results should still render, for example a dashboard, a search across several sources, or a batch where each item is independent. If losing one should not void the rest, `all` is the wrong combinator.

Production symptom (now fixed): a single widget's error becomes a local error tile with its own retry, instead of a blank page or a global error boundary swallowing four healthy widgets.

Common misconception: that `allSettled` can reject, so people defensively wrap it in `try/catch`. It cannot reject on input failure. The one thing that can still throw is a synchronous bug in your `.then`/mapping callback, which is a different error entirely. Also, remember a rejected result is still an error you must surface (tile, log, metric); "it settled" is not "it succeeded."

**Self-check rubric:**
- [ ] I described the `{status, value}` / `{status, reason}` result shape and branched on `status`.
- [ ] I stated `allSettled` never rejects and therefore needs no combinator `try/catch`.
- [ ] I preserved input-to-result correspondence by index (same length, same order).
- [ ] My render shows both a data tile and an error tile per widget.
- [ ] I noted a rejected result is still an error to surface, not a silent success.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the "fan-out notification send" result summary. A backend job sends a push to 10,000 devices with `Promise.allSettled(devices.map(sendPush))` and must return a summary: how many succeeded, how many failed, and the failures grouped by error code so on-call can act. Write the aggregation and explain why `allSettled` is right here and what you must be careful about at 10k concurrency.

**Model answer (revealed on demand):**

`allSettled` is correct because each push is independent: one dead device token must not abort the other 9,999 sends. It waits for all sends to settle and hands back a same-length tagged array, which is exactly the input for a summary.

```js
const results = await Promise.allSettled(devices.map((d) => sendPush(d)));

const summary = results.reduce(
  (acc, r, i) => {
    if (r.status === "fulfilled") {
      acc.sent++;
    } else {
      acc.failed++;
      const code = r.reason?.code ?? "UNKNOWN";
      acc.byCode[code] = (acc.byCode[code] ?? 0) + 1;
      if (acc.samples[code] == null) acc.samples[code] = devices[i].id; // one example per code
    }
    return acc;
  },
  { sent: 0, failed: 0, byCode: {}, samples: {} }
);
```

Because results stay in input order, `results[i]` corresponds to `devices[i]`, so the failure samples map cleanly back to real device ids for on-call to investigate.

Two cautions at 10k. First, `allSettled` gives you failure *reporting*, not *concurrency control*. Fanning out 10,000 real network calls at once will exhaust sockets or trip the push provider's rate limit, and then most of your "failures" are just self-inflicted throttling. You must batch or pool the sends (a concurrency limiter, see the next module) and only then feed the settled results into this summary. Second, `allSettled` builds a 10,000-element array in memory and resolves only after the slowest send settles, so a few hung requests hold the whole summary. Put a per-send timeout (via `Promise.race` or an `AbortController` deadline) on each `sendPush` so one stuck device cannot delay the report.

Spot in review: `allSettled` mapped directly over a huge array with no concurrency cap. The combinator is right; the missing limiter is the bug. Production symptom: a send job that reports thousands of `RATE_LIMITED`/`ETIMEDOUT` failures that are actually caused by the unbounded fan-out itself, not by bad tokens.

**Self-check rubric:**
- [ ] I aggregated `sent`/`failed` and grouped failures by error code from `reason`.
- [ ] I used input-order correspondence to tie failures back to device ids.
- [ ] I said `allSettled` is reporting, not concurrency control, and added a limiter.
- [ ] I added a per-send timeout so one hung request cannot stall the summary.

### ajr-l2-race-any-semantics: race vs any vs all: choosing for partial failure

- **id:** `ajr-l2-race-any-semantics`  ·  **difficulty:** hard  ·  **est:** 14 min  ·  **demo:** js-runnable  ·  **skills:** promises, combinators, timeout

#### Learn

`race` and `any` both settle on the "first" input, but they mean different things by "first," and confusing them ships timeouts that fire on the wrong event and "first success" logic that a fast error breaks.

`Promise.race(iterable)` settles as soon as any input *settles*, and a rejection counts as settling. So `race` forwards the first thing to happen, whether that is a fulfillment or a rejection. If the fastest input rejects, `race` rejects with that reason, even if a slower input would have fulfilled. Race is about *timing*: whoever crosses the line first, win or lose.

`Promise.any(iterable)` settles on the first input to *fulfill*. It ignores rejections until they matter. If some inputs reject, `any` keeps waiting for a fulfillment. Only if *every* input rejects does `any` reject, and it rejects with an `AggregateError` whose `.errors` array holds all the individual reasons. Any is about *success*: give me the first one that works, and only fail if they all fail.

The canonical use of each:

```js
// Timeout: race the real work against a timer that rejects.
function fetchWithTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Fastest healthy mirror: return the first mirror that actually succeeds.
function fastestMirror(urls) {
  return Promise.any(urls.map((u) => fetch(u).then((r) => r.json())));
  // rejects with AggregateError only if EVERY mirror fails
}
```

Now the trap, which is choosing the wrong one. If you build a timeout on `Promise.any`, a fast *rejection* from the real work will be ignored (any waits for a fulfillment), so your "timeout" no longer surfaces a fast failure, and worse, the timer never rejects the way you expect because `any` only rejects when all inputs reject. If you build a "first success" on `Promise.race`, a fast *rejection* from one mirror wins the race and rejects the whole thing, so a single flaky mirror breaks your fallback even though healthy mirrors exist. Same four inputs, opposite outcomes: for a timeout you want the first *settlement* (race), for a fallback you want the first *fulfillment* (any).

And the through-line from the whole module: none of these cancel the losers. `fetchWithTimeout` rejecting at the deadline does not stop the underlying `promise`; it just stops *waiting*. The request runs to completion in the background. If you need it actually stopped, pass an `AbortController` signal and abort in the timeout branch. `Promise.any` returning the fastest mirror leaves the slower mirrors still fetching.

**Interview nuance:** `Promise.any` and its `AggregateError` are ES2021; older environments do not have it, and a hand-rolled "first success" often gets written on `race` by mistake, which is the bug above. Also note the empty-iterable edge: `Promise.any([])` rejects immediately with an `AggregateError` (no candidate can fulfill), while `Promise.race([])` returns a promise that stays pending forever (nothing ever settles).

Recap: `race` settles on the first to settle, so a fast rejection wins and it is the tool for timeouts; `any` settles on the first to fulfill, ignores rejections until all fail, rejects with `AggregateError`, and is the tool for first-success fallback; neither cancels the losers, so pair with `AbortController` when you must stop wasted work.

#### See it live

**Demo (js-runnable):** runs all four combinators (`all`, `allSettled`, `race`, `any`) over the same 4 tasks (one rejects fast at 20ms, one resolves fast at 30ms, two slow) and logs which one each combinator settles on and with what value or error.

```js
// Same 4 tasks fed to all four combinators so you can contrast their choices.
// fast-fail  rejects at 20ms  | fast-ok resolves at 30ms | slow-a 70ms | slow-b 90ms
const t0 = performance.now();
const at = () => (performance.now() - t0).toFixed(0).padStart(3, " ");

const make = () => {
  const mk = (name, ms, reject) => new Promise((res, rej) =>
    setTimeout(() => reject ? rej(new Error(name)) : res(name), ms));
  return [mk("fast-fail", 20, true), mk("fast-ok", 30, false), mk("slow-a", 70, false), mk("slow-b", 90, false)];
};

// A) race: first to SETTLE wins -> the 20ms REJECTION wins
Promise.race(make())
  .then((v) => console.log(`[${at()}ms] race  FULFILLED ${v}`))
  .catch((e) => console.log(`[${at()}ms] race  REJECTED  ${e.message}   <-- fast rejection won`));

// B) any: first to FULFILL wins -> ignores fast-fail, takes fast-ok at 30ms
Promise.any(make())
  .then((v) => console.log(`[${at()}ms] any   FULFILLED ${v}   <-- first success`))
  .catch((e) => console.log(`[${at()}ms] any   REJECTED  ${e.name}`));

// C) all: fail-fast -> the 20ms rejection rejects the whole thing
Promise.all(make())
  .then((v) => console.log(`[${at()}ms] all   FULFILLED`, v))
  .catch((e) => console.log(`[${at()}ms] all   REJECTED  ${e.message}`));

// D) allSettled: waits for all, never rejects -> settles at ~90ms with 4 tagged results
Promise.allSettled(make()).then((rs) =>
  console.log(`[${at()}ms] settled FULFILLED  [${rs.map((r) => r.status).join(", ")}]`));
```

**Watch:** `race` and `all` both log at about 20ms with a REJECTED line, because the fast-failing task is the first to settle. `any` logs at about 30ms with FULFILLED `fast-ok`, because it skipped the 20ms rejection and took the first success. `allSettled` logs last, at about 90ms, with `[rejected, fulfilled, fulfilled, fulfilled]`. Seeing `race` reject at 20ms while `any` fulfills at 30ms over identical inputs is the entire lesson: "first to settle" and "first to fulfill" are different events.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Write `fetchWithTimeout(promise, ms)` using `Promise.race` and a "fastest healthy mirror" using `Promise.any`, then contrast what each does when the fast input rejects. Show both functions and explain, for each, why the other combinator would be the wrong choice.

**Think about:**
- Which combinator ignores rejections until all fail?
- What error does `Promise.any` reject with?
- What do the non-winning promises do afterward?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

```js
// Timeout: race the work against a rejecting timer. First SETTLEMENT wins.
function fetchWithTimeout(promise, ms, signal) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Fastest healthy mirror: first FULFILLMENT wins; rejects only if all fail.
function fastestMirror(urls) {
  return Promise.any(urls.map((u) => fetch(u).then((r) => {
    if (!r.ok) throw new Error(`${u} -> ${r.status}`);
    return r.json();
  })));
}
```

Contrast on a fast rejection. In `fetchWithTimeout`, `race` is correct precisely because it settles on the first *settlement*: if the real work fails fast, that rejection should surface immediately, and if the timer fires first, that rejection is the timeout. You want the earliest event either way. Using `any` here would be wrong: `any` ignores rejections, so a fast real failure would be swallowed while it waits for a fulfillment, and the timer's rejection alone would not settle it (any only rejects when *all* inputs reject). Your "timeout" would not fire on a fast error and could hang.

In `fastestMirror`, `any` is correct because you want the first mirror that *succeeds* and you want a single flaky mirror to be ignored. A fast rejection from mirror A is skipped, and mirror B's success wins. Using `race` here would be wrong: `race` settles on the first settlement, so a fast rejection from one mirror wins the race and rejects the whole fallback, which defeats the point of having mirrors. `Promise.any` rejects only if every mirror fails, and it rejects with an `AggregateError` whose `.errors` array holds each mirror's reason.

Mechanism: `race` forwards the first settlement (fulfill or reject); `any` waits for the first fulfillment and rejects with `AggregateError` only when all reject.

How to spot it in review: a timeout implemented with `any`, or a "first success"/fallback implemented with `race`. Both compile and often look fine in the happy path; they diverge exactly when the fast input rejects.

Production symptom: a timeout that never fires on a fast failure (built on `any`), or a multi-mirror fallback that a single fast 500 breaks (built on `race`).

Common misconception: that `race` and `any` are interchangeable "first one wins" helpers. They settle on different events. Also, neither cancels the non-winners: after `fetchWithTimeout` rejects at the deadline the real request keeps running, and after `fastestMirror` resolves the slower mirrors keep fetching. Pass an `AbortController` signal and abort in the losing branch if you need the work actually stopped.

**Self-check rubric:**
- [ ] `fetchWithTimeout` uses `race` and I explained "first settlement" is what a timeout needs.
- [ ] `fastestMirror` uses `any` and I said it ignores rejections until all fail.
- [ ] I named `AggregateError` (`.errors`) as `any`'s all-fail rejection.
- [ ] I explained why swapping the two breaks on a fast rejection.
- [ ] I noted the losers keep running and mentioned `AbortController` to stop them.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Build a "hedged read with deadline" for a latency-sensitive service. You have three replicas of a read API. You want the first replica that returns a healthy response, but the whole operation must fail if none answer within 200ms, and you must not leave the two losing replica requests running. Compose the combinators and `AbortController` correctly and explain each choice and each failure mode.

**Model answer (revealed on demand):**

You need two different "first" semantics stacked: first *success* across replicas (`any`), bounded by first *settlement* against a deadline (`race`), with an abort so the losers stop.

```js
async function hedgedRead(paths, ms = 200) {
  const controller = new AbortController();
  const firstHealthy = Promise.any(
    paths.map((p) =>
      fetch(p, { signal: controller.signal }).then((r) => {
        if (!r.ok) throw new Error(`${p} -> ${r.status}`);
        return r.json();
      })
    )
  );
  const deadline = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`no replica within ${ms}ms`)), ms)
  );
  try {
    return await Promise.race([firstHealthy, deadline]);
  } finally {
    controller.abort(); // stop the losing replica reads whether we won or timed out
  }
}
```

Why each piece. `Promise.any` over the replicas gives "first healthy response and ignore individual replica errors," so one 500 does not sink the read; it rejects only if *all three* replicas fail, with an `AggregateError` you can log per replica. `Promise.race([firstHealthy, deadline])` bounds the whole thing: the first *settlement* wins, so either a healthy response arrives before 200ms or the deadline rejects. The `finally { controller.abort() }` is the cancellation the combinators never provide: on success it stops the two slower replica requests, and on timeout it stops all of them, so you are not leaking three in-flight reads past the deadline.

Failure modes. If all replicas reject before the deadline, `any` rejects with `AggregateError` and `race` forwards that. If the replicas are just slow, the deadline rejects at 200ms and the abort tears down the in-flight reads. If you had built the outer bound on `any` instead of `race`, the deadline's rejection would be ignored and a slow read could blow past 200ms; if you had built the inner selection on `race` instead of `any`, a single fast replica error would reject the whole read. The two combinators are not interchangeable, and swapping either one reintroduces exactly one of those bugs.

Spot in review: a hedged/fallback read that uses only one combinator, or one that never calls `abort`, so it leaks the losing requests. Production symptom: replica read amplification (every request quietly triples backend load because losers are never cancelled) or a deadline that does not actually cap tail latency.

**Self-check rubric:**
- [ ] I used `any` for first-healthy across replicas and `race` for the deadline.
- [ ] I called `controller.abort()` in `finally` to stop losers on both success and timeout.
- [ ] I identified `AggregateError` as the all-replicas-fail outcome.
- [ ] I explained why swapping `any`/`race` reintroduces a specific bug.
- [ ] I named the leak symptom (replica read amplification) from not aborting.

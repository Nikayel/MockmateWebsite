> Module **3.3** (Check-Then-Act & Dedup) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [3.2](./l3-double-submit-idempotency.md) · Next: [3.4](./l3-optimistic-tearing.md)

# L3 · Check-Then-Act & Dedup

Single-threaded JavaScript still has races: every `await` is a yield point where other callers run, so any "check the state, then act on it" pattern can be split down the middle by concurrency. After this module you can catch the review comments that matter most in concurrent async code, "this `if (!cache[id])` guard goes stale across the `await`," "five copies of this leaf each fire their own request," and "debounce alone will not stop the stale result from winning," and fix each one with the right primitive: cache the in-flight promise, coalesce by key, or combine debounce with abort and tag-matching.

### ajr-l3-check-then-act-toctou: Check-then-act (TOCTOU) races across an await

- **id:** `ajr-l3-check-then-act-toctou`  ·  **difficulty:** hard  ·  **est:** 16 min  ·  **demo:** js-runnable  ·  **skills:** races, toctou, dedup

#### Learn

TOCTOU stands for "time of check to time of use." It is a classic concurrency bug: you check a condition, then later act on it, and something changed the world in the gap between the two. People assume JavaScript is immune because it is single-threaded, but single-threaded is not the same as atomic. The moment your function hits an `await`, it suspends and hands the event loop back, and any other code (including another call to the same function) gets to run before you resume. The check and the act are no longer next to each other; there is a yield point wedged between them.

Here is the canonical version, a lazy cache that "only fetches once":

```js
const cache = {};
async function getOnce(id) {
  if (!cache[id]) {            // CHECK
    cache[id] = await fetch(id); // ...await yields here...
  }                            // ACT (assign) happens much later
  return cache[id];
}
```

Call `getOnce(1)` four times in the same tick. All four run the `if` synchronously first. `cache[1]` is still `undefined` for every one of them, because nobody has assigned it yet, the assignment cannot happen until a `fetch` resolves, which is many ticks away. So all four pass the check, all four call `fetch(1)`, and you get four network requests instead of one. The boolean you checked went stale during the await.

The fix is to make the check-and-act atomic by moving the shared write *before* any await. You cannot store the resolved value synchronously (you do not have it yet), but you can store the promise, which you get synchronously the instant `fetch` is called:

```js
const inflight = {};
function getOnce(id) {
  if (!inflight[id]) {          // CHECK
    inflight[id] = fetch(id);   // ACT, synchronous, no await between them
  }
  return inflight[id];          // everyone shares the same promise
}
```

Now the check and the assignment run in the same synchronous block, with no yield point between them. The first caller creates the promise; the other three see it is already there and return the exact same promise object. One `fetch`, four subscribers, one settle that resolves all four.

**Interview nuance:** the reason a promise is a better lock than a boolean is that the promise *is* the in-flight state and the result channel at once. A boolean says "someone started" but carries no value, so latecomers still have to fetch. A promise says "someone started, and here is where the answer will arrive," so latecomers await the same work. It is a lock and a future rolled into one object.

Recap: `await` is a yield point, so a boolean you check before it is stale by the time you act after it. That is a TOCTOU race even in single-threaded JS. Cache the in-flight promise synchronously, before any await, so the check and act cannot be split apart, and every concurrent caller shares one operation.

#### See it live

**Demo (js-runnable):** fires 4 concurrent `getOnce(1)` calls against a mock `fetch` wrapped in a call counter, once with the naive boolean guard, once with the promise lock, and prints the fetch count for each.

```js
// Mock fetch: counts every real call, resolves after a delay.
let fetchCount = 0;
function fetch(id) {
  fetchCount++;
  return new Promise((res) => setTimeout(() => res(`user:${id}`), 50));
}

// A) Naive check-then-act: boolean guard goes stale across the await.
const cacheA = {};
async function getOnceNaive(id) {
  if (!cacheA[id]) {
    cacheA[id] = await fetch(id);   // yield point splits check from act
  }
  return cacheA[id];
}

// B) Promise lock: store the in-flight promise synchronously.
const inflight = {};
function getOncePromise(id) {
  if (!inflight[id]) {
    inflight[id] = fetch(id);       // no await between check and act
  }
  return inflight[id];
}

(async () => {
  // A) four concurrent callers, naive
  fetchCount = 0;
  await Promise.all([getOnceNaive(1), getOnceNaive(1),
                     getOnceNaive(1), getOnceNaive(1)]);
  console.log('A) naive boolean guard   -> fetch calls =', fetchCount);

  // B) four concurrent callers, promise lock
  fetchCount = 0;
  await Promise.all([getOncePromise(1), getOncePromise(1),
                     getOncePromise(1), getOncePromise(1)]);
  console.log('B) promise lock          -> fetch calls =', fetchCount);
})();
```

**Watch:** variant A logs `fetch calls = 4`. All four callers ran the `if` in the same tick, saw `undefined`, and each started its own fetch, that is the counter proving the boolean went stale across the await. Variant B logs `fetch calls = 1`. The first caller stored the promise synchronously, so the other three found it already present and awaited the same one. Same four concurrent callers, same code shape, but moving the shared write before the await collapses four requests into one.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Prevent two concurrent callers of `if (!cache[id]) { cache[id] = await fetch(id) }` from both passing the check, by caching the in-flight PROMISE. Show the corrected function and say why the promise version cannot be split by concurrency.

**Think about:**
- Why does the boolean go stale during the await?
- How does caching the promise make check-and-act atomic?
- Why is a promise a better lock than a boolean?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

```js
const inflight = {};
function getOnce(id) {
  if (!inflight[id]) {          // check
    inflight[id] = fetch(id);   // act: store the PROMISE, synchronously
  }
  return inflight[id];          // every concurrent caller shares it
}

// Optional: once you want to allow refetching later, evict on settle.
function getOnceEvicting(id) {
  if (!inflight[id]) {
    inflight[id] = fetch(id).finally(() => { delete inflight[id]; });
  }
  return inflight[id];
}
```

Mechanism: `await` yields control back to the event loop. In the broken version the synchronous slice of the function is just the `if` check; the assignment `cache[id] = ...` is scheduled to run *after* `fetch` resolves, many ticks later. So four callers in the same tick all execute the check before any assignment happens, all see `undefined`, and all fetch. Storing the promise moves the shared write into the same synchronous block as the check: `inflight[id] = fetch(id)` runs to completion with no yield in between, so the second caller is guaranteed to see the first caller's write. The check and the act are now atomic with respect to the event loop.

How to spot it in review: look for `if (!shared) { await something; shared = ... }` where `shared` is module-level or otherwise reachable by concurrent calls, and the function can re-enter before the first call settles. The tell is a mutation of shared state that happens *after* an await but is guarded by a check *before* it.

Production symptom: duplicate fetches and duplicate initializations under load (N spinners, N identical requests), and worse when the awaited action has side effects, double-charged payments, two rows inserted, two Stripe customers created, because two callers both "won" the guard.

Common misconception: "single-threaded JavaScript has no races." It has no *shared-memory data races*, but it absolutely has *interleaving races*: every await is a place where other tasks run, so any check-then-act around an await can be interleaved.

**Self-check rubric:**
- [ ] The shared write (`inflight[id] = ...`) happens synchronously, before any await.
- [ ] All concurrent callers return the same promise object, not a fresh fetch.
- [ ] You explain that `await` is the yield point that makes the boolean stale.
- [ ] You state why a promise carries both the lock and the eventual value.
- [ ] You address the "single-threaded means no races" misconception.
- [ ] (Bonus) You handle eviction so a later call can refetch after settle.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Auth token refresh. Your API client calls `getAccessToken()` before every request. When the token expires, the next call refreshes it: `if (isExpired(token)) { token = await refreshToken() }`. Under a burst of 30 simultaneous requests right after expiry, your logs show 30 calls to the refresh endpoint, and the identity provider starts returning `429`, and worse, some refreshes invalidate the others (rotating refresh tokens), so requests start failing auth. Fix it so a burst triggers exactly one refresh that all callers share.

**Model answer (revealed on demand):**

This is the TOCTOU race with a nastier payload: the refresh has a side effect that invalidates concurrent refreshes. Thirty callers hit `isExpired(token)` in the same tick, all see `true` (nobody has assigned the new token yet, that is stranded behind the await), and all call `refreshToken()`. With rotating refresh tokens each successful refresh rotates the credential, so refreshes 2 through 30 race to consume an already-rotated token and fail, and the provider throttles the burst with `429`.

```js
let accessToken = null;
let refreshPromise = null;               // the single-flight lock

function getAccessToken() {
  if (accessToken && !isExpired(accessToken)) {
    return Promise.resolve(accessToken);
  }
  if (!refreshPromise) {                  // synchronous check + act
    refreshPromise = refreshToken()
      .then((tok) => { accessToken = tok; return tok; })
      .finally(() => { refreshPromise = null; }); // reset for next expiry
  }
  return refreshPromise;                  // all 30 callers await this one
}
```

Mechanism: the shared write is `refreshPromise = refreshToken()`, done synchronously, so the first caller in the burst creates the promise and the other 29 find it already set and await it. One network refresh, one rotation, thirty satisfied callers. The `.finally` clears the lock after it settles so the *next* expiry can refresh again; without that reset you would cache the promise forever and never refresh a second time. Note the assignment `accessToken = tok` lives inside the `.then`, so it is shared through the single promise rather than raced by each caller. Production symptom you are eliminating: the `429` storm on the identity provider and the cascade of auth failures from consumed rotating tokens, both of which appear only in the concurrent-burst-after-expiry window, which is the signature of a check-then-act race around the refresh await.

### ajr-l3-inflight-dedup-coalescing: In-flight request dedup (single-flight)

- **id:** `ajr-l3-inflight-dedup-coalescing`  ·  **difficulty:** hard  ·  **est:** 14 min  ·  **demo:** react-demo  ·  **skills:** dedup, coalescing, caching

#### Learn

The previous lesson deduped one function's concurrent calls. This lesson generalizes it to the shape you actually hit in React: the same reusable component, mounted many times on one page, each instance independently asking for data. Picture a `<UserCard id={...} />` used in a comment thread where the same author posted ten times. Ten cards mount, each runs its own `useEffect(() => fetchUser(id), [id])`, and you fire ten requests for the same user. Multiply across a page and it is dozens of redundant round trips, dozens of spinners, and if any of those responses differ slightly (a write landed mid-page), inconsistent snapshots on screen.

It helps to name three things that get conflated:

- **Caching** answers "have I fetched this before?" It serves a *past* result. Its window is however long you keep the entry.
- **Dedup (single-flight, coalescing)** answers "am I fetching this *right now*?" It shares one *in-flight* request among callers that arrive while it is pending. Its window is exactly the lifetime of that one request.
- **Batching** answers "can I combine *different* keys into one call?" It merges `[1,2,3]` into `GET /users?ids=1,2,3`. Different problem, different mechanism.

Dedup is the promise-lock from the previous lesson, keyed and shared across components:

```js
const inflight = new Map();
export function fetchUser(id) {
  if (inflight.has(id)) return inflight.get(id);   // join the pending one
  const p = fetch(`/api/users/${id}`)
    .then((r) => r.json())
    .finally(() => inflight.delete(id));           // evict when it settles
  inflight.set(id, p);
  return p;
}
```

Every component that calls `fetchUser(1)` while a request for `1` is pending gets the same promise. One `fetch`, one settle, all subscribers filled from the shared result, so they cannot disagree. When it settles, the entry is evicted, so a later mount starts fresh (add a real cache on top if you also want to serve past results).

**Interview nuance:** the subtle part is the dedup *window*. It is only "while the request is in flight." If component A finishes and component B mounts a tick later, B starts a new request, dedup did nothing for B, because there was nothing in flight to join. That is the difference between dedup and cache: dedup collapses *concurrent* identical calls; a cache collapses *sequential* ones too. Production libraries stack both.

Recap: N components asking for the same key should produce one request and share the result. Key the pending promise in a map, return the existing one within its in-flight window, then evict. Dedup collapses concurrent identical calls; caching serves past results; batching merges distinct keys. TanStack Query and SWR productionize all of this (dedup within a small window, plus caching, revalidation, and eviction).

#### See it live

**Demo (react-demo):** a widget mounts five `<UserCard id={1} />` at once behind a network counter, with a toggle between the naive fetcher and the coalesced fetcher. A "Network requests" badge shows how many real requests fired; each card shows its own loading then filled state.

The widget renders a shared request-counter badge at the top and a 5-card grid below. A toggle switches which fetcher the cards use. A "Remount all" button unmounts and remounts the five cards in the same tick so their effects run concurrently. Under the naive fetcher the badge climbs to 5 on each remount; under the coalesced fetcher it climbs by exactly 1.

```tsx
let networkCount = 0; // displayed in the badge

// Naive: every card fetches on its own.
function fetchUserNaive(id: number): Promise<User> {
  networkCount++;
  return fakeApi(id); // resolves after ~600ms
}

// Coalesced: identical concurrent calls share one in-flight promise.
const inflight = new Map<number, Promise<User>>();
function fetchUserCoalesced(id: number): Promise<User> {
  const existing = inflight.get(id);
  if (existing) return existing;
  networkCount++;
  const p = fakeApi(id).finally(() => inflight.delete(id));
  inflight.set(id, p);
  return p;
}

function UserCard({ id, fetcher }: { id: number; fetcher: (id: number) => Promise<User> }) {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    let alive = true;
    fetcher(id).then((u) => { if (alive) setUser(u); });
    return () => { alive = false; };
  }, [id, fetcher]);
  return <div className="card">{user ? user.name : "loading..."}</div>;
}
```

**Watch:** with the naive fetcher, pressing "Remount all" makes the badge jump by 5 every time, five cards, five independent requests, five separate spinners resolving on their own. With the coalesced fetcher the badge jumps by exactly 1, all five cards flip from "loading..." to the same name at the same instant because they share one settle. This is a real interactive React demo (the effects and the counter are genuine); the network itself is a `setTimeout`-backed fake so the timing is deterministic. The counter is the proof: 5 versus 1 requests for identical concurrent demand.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Make N components asking for the same key produce exactly one network request and share the result, via a keyed promise cache. Show the fetcher and explain what happens to the second through Nth callers at the runtime level.

**Think about:**
- How does dedup differ from caching and from batching?
- What is the dedup window?
- How does TanStack Query productionize this?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

```js
const inflight = new Map();

export function fetchUser(id) {
  if (inflight.has(id)) return inflight.get(id);   // 2nd..Nth caller: join
  const promise = fetch(`/api/users/${id}`)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .finally(() => inflight.delete(id));           // evict on settle
  inflight.set(id, promise);                       // 1st caller: register
  return promise;
}
```

Mechanism: the map holds the *pending promise* keyed by id. The first caller misses the map, creates the fetch, and registers the promise synchronously. The second through Nth callers arrive while it is still pending, hit `inflight.has(id)`, and return the *same* promise object. A promise has one settlement, and every `.then` attached to it runs against that single result, so one network response fans out to all N subscribers with no chance of disagreement. When the request settles, `.finally` evicts the key so the map does not grow and a future call can start a fresh request.

Dedup versus caching versus batching: dedup shares an *in-flight* request among concurrent callers; caching serves an *already-completed* result to later callers; batching merges *distinct* keys into one call. They compose but are not interchangeable.

How to spot it in review: a `useEffect(() => fetch(...))` inside a leaf component that is rendered many times per page (list rows, avatars, cards) with no shared fetch layer. Each instance owning its own request is the smell.

Production symptom: N identical requests and N spinners for the same data, wasted quota and rate-limit pressure, and inconsistent snapshots when responses for the same key differ because a write landed between them.

Common misconception: "a shared cache dedups everything." It only collapses *identical* keys. Ten cards for ten *different* users still fire ten requests, dedup does nothing there, that is what batching is for. Dedup only helps when the keys collide.

TanStack Query productionizes this: it dedupes identical concurrent `useQuery` calls within a short window, caches results by query key, tracks stale time and revalidation, and garbage-collects unused entries, so you rarely hand-roll the map, but the map is exactly the primitive underneath.

**Self-check rubric:**
- [ ] Concurrent calls for the same key return one shared promise.
- [ ] The key is evicted when the request settles (`.finally`).
- [ ] You distinguish dedup (concurrent) from caching (sequential) from batching (distinct keys).
- [ ] You state the dedup window is the request's in-flight lifetime.
- [ ] You note that distinct keys still fire N requests.
- [ ] You name the inconsistent-snapshot symptom, not just wasted requests.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Feature-flag client at scale. On first paint, forty independent components each call `getFlags()` to read the flag bundle, so cold-start fires forty identical `/flags` requests and your config service melts under the paint storm. You also need: results shared across the page, a *cached* value reused for a short TTL so re-renders within 30 seconds do not refetch, and a way to force-refresh when an admin flips a flag. Design the `getFlags()` layer.

**Model answer (revealed on demand):**

You need both dedup (collapse the forty concurrent cold-start calls) and caching (reuse the result for the TTL so later renders skip the network). Dedup alone would still refetch the moment the first bundle settled; caching alone would still let forty concurrent cold-start calls all miss the cache and fire. Stack them: check the fresh cache first, then join any in-flight request, then start a new one.

```js
let cache = null;                 // { value, at }
let inflight = null;
const TTL = 30_000;

export function getFlags({ force = false } = {}) {
  const now = Date.now();
  if (!force && cache && now - cache.at < TTL) {
    return Promise.resolve(cache.value);   // cache hit: no network
  }
  if (!force && inflight) return inflight;  // join the in-flight cold-start
  inflight = fetch("/flags")
    .then((r) => r.json())
    .then((value) => { cache = { value, at: Date.now() }; return value; })
    .finally(() => { inflight = null; });   // clear the single-flight lock
  return inflight;
}

export function invalidateFlags() { cache = null; }  // admin flip -> next call refetches
```

Mechanism: at cold start `cache` is null and `inflight` is null, so the first of the forty callers starts the fetch and stores the promise; the other thirty-nine hit `inflight` and join it, forty calls collapse to one request. When it settles, the result lands in `cache` with a timestamp and the single-flight lock clears. For the next 30 seconds every `getFlags()` returns the cached value with zero network. After the TTL, or when `invalidateFlags()` nulls the cache, the next call starts a fresh single-flight cycle. `force: true` bypasses both layers for an explicit admin refresh. Production symptom you are eliminating: the cold-start request storm that scales with component count, plus the redundant refetches on every re-render, replaced by one request per TTL window regardless of how many components ask.

### ajr-l3-debounced-search-ordering: Debounced search with cancellation and ordering

- **id:** `ajr-l3-debounced-search-ordering`  ·  **difficulty:** hard  ·  **est:** 16 min  ·  **demo:** react-demo  ·  **skills:** races, debounce, cancellation

#### Learn

Type-ahead search is where people first meet the ordering race, and where they first misdiagnose it. The instinct after seeing a laggy, request-per-keystroke search box is "add a debounce," and debounce is correct but incomplete. Debounce reduces *how many* requests you send; it does nothing about *which order the responses come back*. Those are different problems, and only fixing the first leaves the worst bug in place.

Walk the timeline. The user types `r`, `e`, `a`, `c`, `t`. Even with a debounce you can still send more than one request (the user paused after `rea`, then typed `ct`). Request for `rea` goes out, then request for `react` goes out. Networks do not preserve order: `rea` happens to hit a slow shard and comes back *after* `react`. Your handler does `setResults(response)` on whatever arrives last, so the box ends up showing results for `rea` while the input says `react`. The stale response won the race because it arrived last, not because it is current.

Debounce cannot fix this. Debounce only decides *when to fire*; once two requests are in flight, their arrival order is out of your hands. You need one of two guards (ideally both):

- **Abort:** cancel the previous request when a new one starts, so the superseded `rea` request never delivers.
- **Tag-matching:** stamp each request with the query it was for, and before you commit a response, compare its tag to the *current* input. If they differ, drop it.

```tsx
function useSearch(query: string) {
  const [results, setResults] = useState<string[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await search(query, controller.signal); // abortable
        // tag-match guard: only commit if still the current query
        setResults(res.query === query ? res.items : (prev) => prev);
      } catch (e) { /* aborted: ignore */ }
    }, 250);
    return () => { clearTimeout(t); controller.abort(); }; // debounce + cancel
  }, [query]);
  return results;
}
```

The cleanup runs on every keystroke: `clearTimeout` implements the debounce (a pending timer that never fired sends nothing), and `controller.abort()` cancels an in-flight request from a previous keystroke. Abort handles most of it; the tag-match `res.query === query` is the belt-and-suspenders guard for a response that already left the server before you aborted.

**Interview nuance:** interviewers love to ask whether `useTransition` or `useDeferredValue` fix this. They do not. Those are *rendering* concerns, they let React keep the input responsive while it renders an expensive result list, and mark that render as low priority. They do not dedupe, cancel, or reorder *network* requests. Reaching for them here is a category error: the race is in the data layer, not the render layer.

Recap: debounce limits how many requests you send but not the order responses arrive, so a slow earlier request can still overwrite a newer one. Add an `AbortController` to cancel superseded requests and a tag-match guard to reject any response whose query is no longer current. `useTransition` and `useDeferredValue` are rendering tools and solve none of this.

#### See it live

**Demo (react-demo):** a search box where typing `react` fires requests with randomized per-request latency. A toggle switches between the buggy fetcher (debounce only) and the fixed fetcher (debounce + abort + tag-match). The current input, the committed result label, and a small log of arrivals are shown.

The widget renders a text input, a "current query" readout, a "showing results for" readout, and a scrolling arrival log. Each simulated request resolves after a randomized delay so an earlier query can land after a later one. Under the buggy fetcher the "showing results for" label can disagree with the input (it thrashes and can settle on `rea`). Under the fixed fetcher the label always equals the current input.

```tsx
// Randomized latency so responses can arrive out of order.
function search(query: string): Promise<{ query: string; items: string[] }> {
  const latency = 150 + Math.random() * 900;
  return new Promise((res) =>
    setTimeout(() => res({ query, items: [`results for "${query}"`] }), latency),
  );
}

// BUGGY: debounce only. Commits whatever arrives last.
useEffect(() => {
  const t = setTimeout(async () => {
    const res = await search(query);
    setLabel(res.query);          // stale response can win
  }, 250);
  return () => clearTimeout(t);
}, [query]);

// FIXED: debounce + abort + tag-match.
useEffect(() => {
  const controller = new AbortController();
  const t = setTimeout(async () => {
    const res = await search(query /*, controller.signal */);
    if (!controller.signal.aborted && res.query === query) {
      setLabel(res.query);        // only commit the current query
    }
  }, 250);
  return () => { clearTimeout(t); controller.abort(); };
}, [query]);
```

**Watch:** with the buggy fetcher, type `react` quickly and watch the arrival log show responses landing out of order, the "showing results for" label flickers and can stick on `rea` even though the input says `react`. With the fixed fetcher the label only ever shows the current input; superseded responses are aborted or rejected by the tag-match and never reach the label. This is a real interactive React demo; only the network is a randomized `setTimeout` fake, so the out-of-order arrivals are reproducible on demand rather than dependent on a real flaky network.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Debounce the input, cancel superseded requests, and never render results for an older query, combining all three. Show the effect and explain why debounce alone still lets a stale result win.

**Think about:**
- Does debounce fix out-of-order arrivals?
- What does tag-matching compare?
- How do useTransition/useDeferredValue relate (or not) to this?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

```tsx
function useSearch(query: string) {
  const [results, setResults] = useState<string[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );
        const data = await res.json();
        if (data.query === query) {          // tag-match: still current?
          setResults(data.items);
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") throw err; // ignore aborts
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);
  return results;
}
```

Mechanism: three layers stack. `setTimeout` + `clearTimeout` is the debounce: a keystroke that is quickly followed by another cancels the pending timer, so no request fires for intermediate states. `AbortController` + `controller.abort()` in cleanup cancels a request that already went out for a previous query, so a superseded `rea` request is torn down when `react` starts. The tag-match `data.query === query` is the final guard: even if a response left the server before the abort took effect, you compare its query to the current one and drop it if they differ. Debounce alone fails because it only controls *when you fire*; once two requests are in flight (user paused, then typed more), their arrival order is set by the network, and a slow earlier request can resolve after a fast later one and overwrite it.

How to spot it in review: a `fetch` called directly in `onChange` with no debounce and no abort, or a debounced fetch that commits `setResults(await ...)` without comparing the response to the current query.

Production symptom: the search box flickers to wrong results as you type and sometimes *sticks* on a stale result (the last-arriving one wins), which users read as "search is broken."

Common misconception: that `useTransition` or `useDeferredValue` fix search ordering. They are rendering-priority tools that keep the UI responsive during expensive renders; they do not dedupe, cancel, or order network requests. The race lives in the data layer.

**Self-check rubric:**
- [ ] Debounce (clearTimeout on change) prevents a request per keystroke.
- [ ] Superseded requests are aborted via `AbortController` in cleanup.
- [ ] A tag-match compares the response's query to the current query before committing.
- [ ] Aborts are swallowed, not surfaced as errors.
- [ ] You explain why debounce alone leaves the ordering race.
- [ ] You correctly place `useTransition`/`useDeferredValue` as rendering, not networking, tools.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Paginated, filterable data grid. The toolbar has a search box, a status dropdown, and page controls, and each change refetches `/rows?q=&status=&page=`. QA reports that fast interactions (type, then immediately change the filter, then page) sometimes land the grid on rows that match a *previous* combination of inputs, and occasionally a spinner never clears. Design the fetch so the grid only ever shows rows matching the *current* full query, across all three inputs.

**Model answer (revealed on demand):**

The bug is the same ordering race, but the "tag" is no longer a single string, it is the whole query tuple `(q, status, page)`. Any in-flight request from an older tuple can resolve last and overwrite the current view, and the "stuck spinner" is a request that was superseded but whose `finally(() => setLoading(false))` you skipped because you bailed out early. The fix is to key everything on the current tuple and only commit or clear loading for responses that still match it.

```tsx
function useGrid(q: string, status: string, page: number) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const key = JSON.stringify({ q, status, page });   // the tag
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/rows?q=${encodeURIComponent(q)}&status=${status}&page=${page}`,
          { signal: controller.signal },
        );
        const data = await res.json();
        if (data.key === key) {              // only commit the current tuple
          setRows(data.rows);
          setLoading(false);
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") setLoading(false);
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [q, status, page]);
  return { rows, loading };
}
```

Mechanism: the effect depends on all three inputs, so any change tears down the previous request (abort + clearTimeout) and starts a fresh one, and the server echoes back a `key` (or you reconstruct it client-side) so the tag-match compares the *entire* input tuple, not just the search text. Only a response matching the current tuple commits rows and clears loading, so an older combination can never win. The stuck-spinner fix is subtle: because the superseded request is aborted, its `AbortError` path must not clear loading for the *new* request, and only the matching response flips loading off, so loading tracks the current tuple exactly. Production symptom you are eliminating: the grid showing rows for a stale filter/page combination, and the spinner that never resolves because loading was owned by a request that got superseded, both of which only appear under fast multi-control interaction, the signature of an ordering race keyed on a composite query.

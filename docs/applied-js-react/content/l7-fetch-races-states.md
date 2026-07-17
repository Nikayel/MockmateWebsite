> Module **7.2** (Races & States) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [7.1](./l7-waterfalls-n-plus-1.md) · Next: [7.3](./l7-caching-swr.md)

# L7 · Races & States

After this module you will catch the three data-fetching bugs that pass review and only bite in production: a component that paints the wrong record after a fast click because promises resolved out of order, a `fetch` chain that treats a 500 error page as valid data until `JSON.parse` explodes, and a StrictMode double-fetch that engineers "fix" by deleting StrictMode instead of adding cleanup. Each lesson centers on real code you run and a demo you watch fail before you fix it.

### ajr-l7-component-fetch-race: The component fetch race and UI states

- **id:** `ajr-l7-component-fetch-race`  ·  **difficulty:** hard  ·  **est:** 14 min  ·  **demo:** react-demo  ·  **skills:** react, races, fetch-states

#### Learn

An effect that fetches by `id` starts one request per committed `id`. The requests are independent promises, and promises resolve in completion order, not launch order. If request A (for `id=3`) is slow and request B (for `id=7`) is fast, B resolves first, then A resolves and overwrites the UI with stale data. The user sees user 7, then a flicker back to user 3, on a screen that should say 7.

Here is the bug in its natural habitat:

```tsx
function UserCard({ id }: { id: number }) {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    fetchUser(id).then(setUser); // no guard, no cleanup
  }, [id]);
  return <div>{user?.name ?? "Loading..."}</div>;
}
```

Type `3` then quickly `7`. Two effects have committed, so two `fetchUser` calls are in flight. Whichever network response lands last wins the `setUser` race, and the network does not promise to preserve your order. Nothing in this code ties a response back to the render that asked for it.

The classic fix is an `ignore` flag captured per effect run, flipped in cleanup:

```tsx
useEffect(() => {
  let ignore = false;
  fetchUser(id).then((u) => {
    if (!ignore) setUser(u);
  });
  return () => {
    ignore = true;
  };
}, [id]);
```

React runs the cleanup of the previous effect before running the next one. When `id` goes `3 -> 7`, the `id=3` effect's cleanup sets its own `ignore = true`. That closure is distinct from the `id=7` closure, so when the slow `id=3` response finally arrives, its `if (!ignore)` is false and it is dropped. Only the response belonging to the current committed render can call `setUser`.

**Interview nuance:** the `ignore` flag prevents the stale `setState`, but the stale request still runs to completion and still costs bandwidth. Adding an `AbortController` and passing `controller.signal` to `fetch`, then calling `controller.abort()` in cleanup, actually cancels the in-flight request. The flag protects correctness; abort protects correctness and cost. Use abort when the endpoint is expensive or you are on mobile data.

The other half of this lesson is the four states every fetch has, not one. Real UI needs `loading`, `error`, `empty` (a 200 with zero rows is not the same as "still loading"), and `data`. Returning `user?.name ?? "Loading..."` conflates "no user yet" with "loading" with "the user genuinely has no name". Model the state explicitly with a discriminated union or four booleans so each branch renders on purpose.

**Interview nuance:** the reason React Query, SWR, and RTK Query make this class of bug vanish is that they key cached data by its input (the `id`). A response is stored under the key that requested it, so a late `id=3` response can never land in the `id=7` slot. Saying "React Query is overkill for one fetch" misses that it removes the entire race by construction, not by discipline.

Recap: overlapping fetches resolve in completion order, so guard every effect with an `ignore` flag (or abort) in cleanup, and render loading, error, empty, and data as four explicit branches.

#### See it live

**Demo (react-demo):** two side-by-side user panels, one unguarded and one guarded, that you feed a fast sequence of user IDs with random 200-2000ms response delays.

The widget renders a numeric input (or three quick buttons "Load 3", "Load 7", "Load 9"), and two panels labeled **Unguarded** and **Guarded (ignore flag + AbortController)**. Each panel shows the currently committed `id`, the last committed user name, and a scrolling trace. Every `fetchUser` mock resolves after `200 + Math.random() * 1800` ms. When a response arrives, the trace logs `resolved id=X but current id=Y -> DROPPED` if `X !== Y`, or `committed id=X` otherwise. A "committed id" badge on each panel updates live so you can see the unguarded panel land on a wrong name while its badge says something else. The panels are built around this:

```tsx
function GuardedUserCard({ id }: { id: number }) {
  const [state, setState] = useState<{ status: "loading" | "error" | "empty" | "data"; user?: User }>({
    status: "loading",
  });
  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();
    setState({ status: "loading" });
    fetchUser(id, controller.signal)
      .then((u) => {
        if (ignore) return;                       // trace: resolved id=X -> DROPPED
        setState(u ? { status: "data", user: u } : { status: "empty" });
      })
      .catch((e) => {
        if (!ignore && e.name !== "AbortError") setState({ status: "error" });
      });
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [id]);

  if (state.status === "loading") return <Spinner />;
  if (state.status === "error") return <ErrorBox onRetry={/* refetch */} />;
  if (state.status === "empty") return <p>No such user.</p>;
  return <div>{state.user!.name}</div>;
}
```

**Watch:** feed both panels `3` then immediately `7`, where `3` happens to draw the slow delay. The unguarded panel first shows 7, then flickers back to user 3 while its badge still reads `id=7`, with a trace line `resolved id=3 but current id=7 -> DROPPED` that the unguarded version ignored anyway. The guarded panel stays on 7 forever and its trace shows the same line was actually dropped, plus an `abort` on the `id=3` request. That contrast is the whole point: same network timing, opposite outcomes, because one panel ties responses to the render that asked for them and the other does not.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Fix `useEffect(()=>{ fetchUser(id).then(setUser) }, [id])` so it never commits a stale response, and add loading, error, and empty states so the component renders each on purpose instead of overloading one fallback.

**Think about:**
- Where do you set the ignore flag / call abort?
- Must the id be in the deps?
- What does abort add over the flag?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The corrected effect guards the commit and models all four states:

```tsx
type Async<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "data"; user: T };

function UserCard({ id }: { id: number }) {
  const [state, setState] = useState<Async<User>>({ status: "loading" });

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();
    setState({ status: "loading" });

    fetchUser(id, controller.signal)
      .then((u) => {
        if (ignore) return;
        setState(u ? { status: "data", user: u } : { status: "empty" });
      })
      .catch((e) => {
        if (!ignore && e.name !== "AbortError") {
          setState({ status: "error", message: String(e) });
        }
      });

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [id]);

  switch (state.status) {
    case "loading": return <Spinner />;
    case "error":   return <ErrorBox message={state.message} />;
    case "empty":   return <p>No such user.</p>;
    case "data":    return <h2>{state.user.name}</h2>;
  }
}
```

**Why, at the mechanism level:** effects run once per committed render, and React runs the previous effect's cleanup before the next effect body. Each effect run has its own `ignore` closure and its own `AbortController`. When `id` changes, the old cleanup flips its `ignore` to true and aborts its request, so a late response from the previous `id` fails the `if (ignore)` check and never calls `setState`. `id` must be in the deps: without it the effect never re-runs, so it fetches the first `id` and then silently shows stale data forever (and the linter flags the missing dep). The flag stops the stale commit; `abort` additionally cancels the wasted request and, with a `signal`, lets you skip the `AbortError` in the catch so a cancel is not misreported as an error.

**How to spot it in review:** a `fetch`/`fetchUser` inside `useEffect` that does `setState` in `.then` with no cleanup return, or a deps array missing the id it reads. Also flag any component that renders a single `?? "Loading..."` fallback, which hides the empty and error states.

**Production symptom:** a detail card or profile pane briefly shows the wrong record after fast navigation or typing, then usually corrects itself, which makes it hard to reproduce and easy to dismiss as "flaky".

**Common misconception:** that reaching for React Query here is overkill. It is not a matter of taste: keying cached data by the input `id` removes the race by construction, because a response can only ever be written into the slot for the id that requested it.

**Self-check rubric:**
- [ ] `ignore` is declared inside the effect and set true in the returned cleanup.
- [ ] `id` is in the dependency array.
- [ ] The `.catch` ignores `AbortError` so a cancel is not shown as an error.
- [ ] All four states (loading, error, empty, data) render distinctly.
- [ ] You can explain why each effect run needs its own flag/controller closure.

#### Practice: real-world variant (save, then reveal)

**Prompt:** "Search-as-you-type autocomplete." You have a search box whose `useEffect` runs `search(query).then(setResults)` on every keystroke. QA reports that after typing fast, the dropdown sometimes shows results for an earlier prefix (type "reac", see results for "rea"). Rewrite the effect so results always match the latest committed query, keep loading and empty states, and say why debouncing alone does not fix the race.

**Model answer (revealed on demand):**

Debouncing reduces how many requests fire, but it does not order their responses. Even one request per 300ms can still resolve out of order if an earlier one is slow, so the race survives debouncing. You need both: debounce to cut request volume, and a per-run guard so only the latest query commits.

```tsx
useEffect(() => {
  if (query.trim() === "") {
    setState({ status: "empty" });
    return;
  }
  let ignore = false;
  const controller = new AbortController();
  setState({ status: "loading" });

  const t = setTimeout(() => {
    search(query, controller.signal)
      .then((rows) => {
        if (ignore) return;
        setState(rows.length ? { status: "data", rows } : { status: "empty" });
      })
      .catch((e) => {
        if (!ignore && e.name !== "AbortError") setState({ status: "error" });
      });
  }, 300);

  return () => {
    ignore = true;
    controller.abort();
    clearTimeout(t);
  };
}, [query]);
```

**Why:** cleanup does three things now. `clearTimeout` cancels a debounced request that has not fired yet (the common case when typing fast). `abort` cancels a request already in flight for a superseded query. `ignore` is the backstop that stops any response that still resolves after the query changed from ever calling `setState`. The three layers correspond to the three moments a keystroke can arrive: before the timer fires, during the request, and after the request resolves.

**How to spot it in review:** an autocomplete or filter effect with a bare `.then(setResults)`, especially one where someone added a debounce and closed the ticket, because the debounce hides the race in slow-typing demos while leaving it live under real latency.

**Production symptom:** the dropdown "lags" a character behind under load, or an old prefix's results flash over the current ones, which is worst on mobile networks where response times vary most. At scale this is the top complaint on search boxes that "work on my machine".

### ajr-l7-fetch-not-reject-http: fetch does not reject on HTTP 4xx/5xx

- **id:** `ajr-l7-fetch-not-reject-http`  ·  **difficulty:** easy  ·  **est:** 12 min  ·  **demo:** js-runnable  ·  **skills:** react, fetch, error-handling

#### Learn

`fetch` rejects its promise only on a network-level failure: DNS failure, connection refused, CORS block, or a request aborted mid-flight. An HTTP error status is a successful round trip as far as `fetch` is concerned. A 404, a 500, a 502 from a load balancer: the promise resolves, and `res.ok` is the only thing telling you the server was unhappy. This is written into the Fetch standard and trips up nearly everyone coming from jQuery or axios.

Here is the bug:

```js
function getUser(id) {
  return fetch(`/api/users/${id}`).then((r) => r.json());
}
```

When the server returns `500` with an HTML error page (an nginx "502 Bad Gateway", a framework stack-trace page, a Cloudflare challenge), this chain does not reject at the `fetch`. It sails into `r.json()`, which tries to parse `<!DOCTYPE html>...` as JSON and throws `SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON`. Your error boundary or `.catch` does fire, but it fires with a confusing parse error that points at your client code instead of the truth, which is that the server returned a 500.

The fix is one guard before parsing:

```js
async function getUser(id) {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for /api/users/${id}`);
  }
  return res.json();
}
```

Now a 500 throws a clean, accurate `HTTP 500` before any parsing happens, and only a genuine 2xx body reaches `res.json()`.

**Interview nuance:** this is exactly why data libraries need the guard too. React Query treats a thrown error (or a rejected promise) as the error state, and Suspense error boundaries only catch a thrown value. If your query function does `fetch(...).then(r => r.json())` with no `res.ok` check, then a 500 either resolves as "successful data" (React Query caches the HTML error page as valid data) or throws a misleading parse error. Either way the error path you wired up never fires for the reason you think. The guard is what connects HTTP failure to your framework's error handling.

**Interview nuance:** axios and ky differ by default. axios rejects on any status outside 2xx (its `validateStatus`), and ky throws an `HTTPError` for non-2xx. That is why teams migrating from axios to `fetch` suddenly start caching error pages: the old library was throwing for them, and raw `fetch` does not. Knowing this distinction is a common senior screening question.

Recap: `fetch` resolves for every HTTP status and rejects only on network failure, so check `res.ok` (or `res.status`) before `res.json()`, which is also what makes React Query and Suspense error paths actually fire.

#### See it live

**Demo (js-runnable):** two versions of the same fetch against a mocked endpoint that returns HTTP 500 with an HTML body, the naive `.then(r => r.json())` versus a `res.ok` guard.

```js
// Mock a server that returns 500 with an HTML error page.
function mockFetch(url) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        ok: false,
        status: 500,
        // Body is an HTML error page, not JSON.
        text: () => Promise.resolve("<!DOCTYPE html><html><body>502 Bad Gateway</body></html>"),
        json: () => Promise.resolve(JSON.parse("<!DOCTYPE html><html><body>502 Bad Gateway</body></html>")),
      });
    }, 100);
  });
}

// A) NAIVE: no res.ok check, parse straight away.
async function naive() {
  try {
    const res = await mockFetch("/api/users/7");
    const data = await res.json(); // throws "Unexpected token <"
    console.log("[A naive] got data:", data);
  } catch (e) {
    console.log("[A naive] caught:", e.name, "-", e.message);
    console.log("[A naive] note: status was actually 500, but the error blames JSON parsing");
  }
}

// B) GUARDED: check res.ok before parsing.
async function guarded() {
  try {
    const res = await mockFetch("/api/users/7");
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    console.log("[B guarded] got data:", data);
  } catch (e) {
    console.log("[B guarded] caught:", e.name, "-", e.message);
    console.log("[B guarded] clean, accurate error: the server returned 500");
  }
}

(async () => {
  await naive();
  console.log("---");
  await guarded();
})();
```

**Watch:** variant A logs a `SyntaxError - Unexpected token '<'`, which points at `JSON.parse` even though the real problem was a 500 from the server. Variant B throws `Error - HTTP 500` before it ever tries to parse, so the message names the actual failure. Same endpoint, same 500 response, but only the guarded version produces an error a teammate can act on. This proves that without `res.ok` the failure surfaces as a misleading client-side parse crash instead of the server error it really is.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Fix a `.then(r => r.json())` chain to check `res.ok` before parsing, so that Suspense and React Query error paths actually fire on a 4xx/5xx instead of caching an error page or throwing a confusing parse error. Show the corrected query function.

**Think about:**
- When does fetch actually reject?
- What does React Query treat as an error?
- How do axios/ky differ?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The corrected query function guards on `res.ok` and throws a useful error:

```ts
async function fetchUser(id: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) {
    // Optionally read the body for context, but do not parse it as JSON.
    const body = await res.text().catch(() => "");
    throw new Error(`GET /api/users/${id} failed: ${res.status} ${res.statusText} ${body.slice(0, 120)}`);
  }
  return res.json() as Promise<User>;
}

// Used with React Query, the error path now fires correctly:
useQuery({ queryKey: ["user", id], queryFn: () => fetchUser(id) });
```

**Why, at the mechanism level:** `fetch` resolves its promise for any completed HTTP exchange and rejects only on a network-layer failure (DNS, refused connection, CORS, abort). A 500 is a completed exchange, so the promise resolves and `res.ok` is `false`. React Query and Suspense boundaries key off a thrown or rejected value to enter their error state, so unless your query function throws on `!res.ok`, a 500 is treated as success. Worse, if the 500 body is HTML, `res.json()` throws a `SyntaxError` that gets reported as an error, but one that blames your parsing rather than the server, and only by luck, since a 500 that happened to return valid JSON would be cached as real data.

**How to spot it in review:** any `r => r.json()` or `res.json()` with no preceding `res.ok`/`res.status` check, especially inside a React Query `queryFn` or a Suspense-connected loader. Reading the body twice (calling both `.json()` and `.text()`) is a secondary smell.

**Production symptom:** "Unexpected token '<'" or "is not valid JSON" in client logs during an incident, error pages rendered as if they were data, and error boundaries that do not trip on real outages because the failure was swallowed as a successful-but-garbage response.

**Common misconception:** that `fetch` rejects on a 500. It does not. Only network failures reject; every HTTP status, including 4xx and 5xx, resolves.

**Self-check rubric:**
- [ ] There is a `res.ok` (or `res.status`) check before any `res.json()`.
- [ ] The thrown error includes the status so logs name the real failure.
- [ ] The 500 body is not parsed as JSON.
- [ ] You can state when `fetch` actually rejects (network only).
- [ ] You can explain why React Query's error state depends on this throw.

#### Practice: real-world variant (save, then reveal)

**Prompt:** "Payments API shared client." You own a `request()` helper used by the whole app. It does `fetch(url, opts).then(r => r.json())`. Incidents show that when the payments service returns `429 Too Many Requests` (with a JSON body) or `503` (with an HTML page), the app either retries into an infinite loop or shows a blank screen. Rewrite `request()` so callers get a typed error that distinguishes retryable from fatal statuses, and say how this changes retry behavior.

**Model answer (revealed on demand):**

The shared client must inspect the status and turn it into a typed error before parsing, so retry logic can make decisions:

```ts
class HttpError extends Error {
  constructor(public status: number, public body: string, public retryable: boolean) {
    super(`HTTP ${status}`);
    this.name = "HttpError";
  }
}

async function request<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, opts);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    // 408/429 and 5xx are transient; 4xx (except 408/429) are caller mistakes.
    const retryable = res.status === 408 || res.status === 429 || res.status >= 500;
    throw new HttpError(res.status, body.slice(0, 200), retryable);
  }
  return res.json() as Promise<T>;
}
```

**Why:** the previous code could not tell a 429 from a 200, so any retry wrapper either retried everything (including 400 validation errors that will never succeed, hence the loop) or retried nothing. By throwing an `HttpError` with a `retryable` flag derived from the status, the retry layer can back off on 429/5xx and fail fast on 4xx. Reading the body with `.text()` (never `.json()` on an error) avoids the parse crash when a 503 returns an HTML gateway page, while still capturing a JSON 429 body for logging. Honoring `Retry-After` from `res.headers` would be the next refinement.

**How to spot it in review:** a shared `request`/`apiClient` that parses `.json()` unconditionally, or a retry helper that retries on any thrown error without checking the status. Both let a permanent 400 masquerade as a transient failure.

**Production symptom:** retry storms that amplify an outage (every client hammering a 503 endpoint), infinite spinners on validation errors, and payment flows that hang because a 429 was parsed as data and produced `undefined` downstream.

### ajr-l7-strictmode-double-fetch: StrictMode double-fetch in development

- **id:** `ajr-l7-strictmode-double-fetch`  ·  **difficulty:** easy  ·  **est:** 10 min  ·  **demo:** react-demo  ·  **skills:** react, strictmode, fetch

#### Learn

In development, React StrictMode mounts a component, immediately unmounts it, then mounts it again. Every effect therefore runs setup, cleanup, setup on that first mount. A naive fetching effect with no cleanup fires the request twice, you see two entries in the Network tab, and the instinct is to blame React or to delete `<StrictMode>`. Both instincts are wrong.

Here is the effect that double-fires:

```tsx
useEffect(() => {
  fetch(`/api/users/${id}`)
    .then((r) => r.json())
    .then(setUser); // no cleanup: nothing cancels the first request
}, [id]);
```

Under StrictMode the first mount's effect fires request #1, cleanup runs (and does nothing, because there is no return), then the second mount's effect fires request #2. Two requests, and whichever resolves last wins the `setUser` race, which is the same out-of-order hazard from the first lesson wearing a different hat.

The correct response is to add cleanup that cancels the first request, not to remove StrictMode:

```tsx
useEffect(() => {
  const controller = new AbortController();
  fetch(`/api/users/${id}`, { signal: controller.signal })
    .then((r) => r.json())
    .then(setUser)
    .catch((e) => {
      if (e.name !== "AbortError") throw e;
    });
  return () => controller.abort();
}, [id]);
```

Now StrictMode's first-mount cleanup aborts request #1, so even though two `fetch` calls start, only the second one commits. In production, where the effect runs once, this exact code fires one request with no abort. The cleanup is free insurance that becomes load-bearing the moment a real remount happens.

**Interview nuance:** the double-fetch is not a bug to silence. It is StrictMode deliberately exercising the mount/unmount/mount cycle to surface effects that are not resilient to remounting. React 18 and later can legitimately unmount and remount components (offscreen rendering, future features, fast refresh), and any effect that misbehaves under StrictMode's double invoke will misbehave for real then. The dev double-fetch is a free test of whether your effect cleans up after itself.

**Interview nuance:** "just add a `hasFetched` ref guard" is the wrong fix. A `if (didFetch.current) return;` makes the second dev call go away, but it fakes idempotency by refusing to run rather than making a re-run safe, and it breaks the moment `id` legitimately changes or the component genuinely remounts, because the ref is now stale and blocks a needed fetch. Cleanup (abort) or a keyed cache (React Query, which dedupes concurrent requests for the same key) are the real fixes.

Recap: dev StrictMode double-invokes effects to expose missing cleanup, so add an `AbortController` (or use a keyed/deduped cache) and keep StrictMode; production runs the effect once regardless.

#### See it live

**Demo (react-demo):** a live request counter under StrictMode, a naive fetching effect versus an `AbortController`-cleanup version, with a badge stating what production does.

The widget renders a **StrictMode: on** toggle, two panels labeled **Naive** and **AbortController cleanup**, a big **Requests started: N** and **Requests committed: N** counter per panel, and a scrolling trace of `start #1`, `abort #1`, `commit #2`. A "Remount" button unmounts and remounts both children so the learner can trigger the cycle on demand. A persistent badge reads **production = 1 committed** on each panel. The children are built around this:

```tsx
function UserPanel({ id, mode }: { id: number; mode: "naive" | "abort" }) {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    countStart();                                 // Requests started += 1
    fakeFetchUser(id, mode === "abort" ? controller.signal : undefined)
      .then((u) => { countCommit(); setUser(u); }) // Requests committed += 1
      .catch((e) => { if (e.name !== "AbortError") throw e; });
    return () => {
      if (mode === "abort") controller.abort();    // trace: abort #1
    };
  }, [id, mode]);
  return <div>{user?.name ?? "..."}</div>;
}
```

**Watch:** with StrictMode on, the **Naive** panel shows **Requests started: 2** and **Requests committed: 2** (both dev requests ran to completion and raced). The **AbortController** panel shows **Requests started: 2** but **Requests committed: 1**, with a trace `start #1`, `abort #1`, `start #2`, `commit #2`. The **production = 1 committed** badge is honest: this counter reflects development behavior, and the demo cannot literally run a production React build in the browser, so it labels what production would do rather than pretending to show it. The takeaway is that abort makes the double-invoke settle at one committed request, which is exactly what production needs.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Show the dev double request, then demonstrate the correct response (an `AbortController` in cleanup, or a keyed cache), not disabling StrictMode. Give the fixed effect and explain why removing StrictMode is the wrong move.

**Think about:**
- Why does the effect run twice in dev?
- Does this happen in production?
- What is the real fix?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The fixed effect keeps StrictMode and adds abort in cleanup:

```tsx
useEffect(() => {
  const controller = new AbortController();
  fetch(`/api/users/${id}`, { signal: controller.signal })
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(setUser)
    .catch((e) => {
      if (e.name !== "AbortError") setError(e);
    });
  return () => controller.abort();
}, [id]);
```

Or, with a keyed cache that dedupes concurrent requests by key:

```tsx
const { data: user } = useQuery({ queryKey: ["user", id], queryFn: () => fetchUser(id) });
```

**Why, at the mechanism level:** in development React StrictMode intentionally mounts, unmounts, then remounts each component on first mount, so every effect runs setup, cleanup, setup. A fetch with no cleanup fires two requests. Adding `controller.abort()` in cleanup means the first mount's teardown cancels request #1, so only the second commits. In production the effect runs once, so this same code fires a single request and the abort simply never triggers. React Query solves it differently: two concurrent requests for the same `queryKey` are deduped into one, so the double invoke shares a single request by construction.

**How to spot it in review:** the tell is a pull request that removes `<StrictMode>` or wraps an effect in a `didFetch` ref guard to "fix duplicate requests". Both hide the symptom. The genuine fix always adds cleanup or moves to a keyed/deduped cache.

**Production symptom:** the dev double-fetch itself is invisible in production, but the underlying defect (an effect with no cleanup) double-fires for real whenever a component genuinely remounts, for example via fast navigation, tab switches, or React 18 offscreen features, producing duplicate requests and the out-of-order commit race in the wild.

**Common misconception:** that the dev double-fetch is a React bug or a nuisance to silence. It is a deliberate smoke test. If your effect cleans up, the double invoke settles cleanly; if it does not, StrictMode is showing you a bug that ships.

**Self-check rubric:**
- [ ] `<StrictMode>` is kept, not removed.
- [ ] Cleanup calls `controller.abort()` (or the fetch uses a keyed/deduped cache).
- [ ] The catch ignores `AbortError` so a cancel is not reported as an error.
- [ ] You can explain that production runs the effect once regardless.
- [ ] You did not use a `didFetch` ref guard as the fix.

#### Practice: real-world variant (save, then reveal)

**Prompt:** "Analytics ping on mount." A teammate added `useEffect(() => { fetch('/api/track', { method: 'POST', body: JSON.stringify({ event: 'view', id }) }); }, [id])` and is now seeing double-counted page views in dev and occasional doubles in production. They propose deleting StrictMode. Explain why the double is happening, why a POST side effect is different from a GET fetch, and give the correct fix.

**Model answer (revealed on demand):**

A POST that mutates server state is not safe to run twice, and cleanup-via-abort is not a reliable fix because the request may already have reached the server before abort fires. The double in dev comes from StrictMode's mount/unmount/mount, and the occasional production double comes from real remounts (navigation, remount on key change). The right fix is to make the write idempotent or to guard it at a layer that survives remounts, not to remove StrictMode.

```tsx
// Option A: idempotency key so the server dedupes retries/doubles.
useEffect(() => {
  const controller = new AbortController();
  const dedupeKey = `${id}:${sessionViewId}`; // stable per logical view
  fetch("/api/track", {
    method: "POST",
    signal: controller.signal,
    headers: { "Idempotency-Key": dedupeKey },
    body: JSON.stringify({ event: "view", id }),
  }).catch((e) => { if (e.name !== "AbortError") throw e; });
  return () => controller.abort();
}, [id]);
```

**Why:** GET is safe to repeat because it does not change state, so for reads an abort in cleanup fully solves the double. A POST changes server state, and abort races the network: the request can land before cleanup runs, so you cannot rely on cancellation to prevent a duplicate write. The durable fix is server-side idempotency (a dedupe key the server honors), which makes a double request a no-op regardless of how many times the client remounts. Client-side, a debounced or module-level dedupe by `dedupeKey` reduces the volume, but only the server key guarantees correctness.

**How to spot it in review:** a mutating request (POST/PUT/PATCH/DELETE) fired directly from `useEffect` with no idempotency key and no dedupe, especially analytics or "mark as read" pings. Any such effect is a double-count waiting for a remount.

**Production symptom:** inflated view counts, duplicate orders or emails, double-charged actions after users navigate back and forth, and metrics that quietly overcount by a factor that grows with how often the component remounts. These are the incidents that make "just remove StrictMode" tempting and wrong, because the real remounts in production would still double-fire.

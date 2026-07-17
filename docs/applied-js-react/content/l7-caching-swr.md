> Module **7.3** (Caching, Dedup & SWR) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [7.2](./l7-fetch-races-states.md) · Next: [7.4](./l7-mutations-optimistic.md)

# L7 · Caching, Dedup & SWR

After this module you can catch the code-review smells that turn a data layer into a spinner factory: bespoke `useEffect` fetches that re-request on every mount, a `staleTime` vs `gcTime` mix-up that either hammers the network or freezes stale data on screen, and pagination that blanks the table on every page change. You will be able to name the exact React Query mechanism behind each and the production symptom it produces.

### ajr-l7-cache-dedup-swr: Caching, dedup, and stale-while-revalidate

- **id:** `ajr-l7-cache-dedup-swr`  ·  **difficulty:** medium  ·  **est:** 14 min  ·  **demo:** react-demo  ·  **skills:** react, caching, react-query

#### Learn

The default React pattern for loading data is a hook that owns its own state: `useState` for the value, `useEffect` to fire the fetch, a loading flag. It works for one component. It falls apart the moment two components on the same screen want the same data, or a user navigates away and back.

Consider a `UserBadge` rendered in the header, the sidebar, and a comment row, all for the same `userId`:

```tsx
function useUser(id: string) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    fetch(`/api/users/${id}`).then(r => r.json()).then(u => {
      setUser(u);
      setLoading(false);
    });
  }, [id]);
  return { user, loading };
}
```

Three mounts, three independent `fetch` calls, three spinners, three copies of the same object in memory. Nothing coordinates them because each hook instance has its own closure and its own state. React does not dedupe client-side `fetch`. There is no shared layer for the browser to notice "you already asked for `/api/users/7` a millisecond ago."

React Query (TanStack Query) adds that shared layer. You describe data by a **query key**, and the library owns a single cache keyed by it:

```tsx
function useUser(id: string) {
  return useQuery({
    queryKey: ["user", id],
    queryFn: () => fetch(`/api/users/${id}`).then(r => r.json()),
  });
}
```

Now the three badges resolve to the same key `["user", 7]`. The first mount starts one in-flight promise; the second and third mounts subscribe to that same promise instead of starting their own. That is **request deduplication**. One network call, one cache entry, three subscribers.

The key must include every input the `queryFn` reads. `["user", id]` is right because the fetch depends on `id`. If your fetch also read a `locale`, the key must be `["user", id, locale]`, or you would serve French data to an English request from a stale cache entry. The key IS the cache identity.

The second payoff is **stale-while-revalidate (SWR)**. When you navigate away and remount the badge, React Query returns the cached user **synchronously** on the first render, so the UI paints instantly, then fires a background refetch if the entry is stale. The user sees data immediately, and fresh data swaps in a moment later without a spinner. The classic `useEffect` hook cannot do this: it starts from `null` every mount and shows a spinner every time.

Interview nuance: "stale-while-revalidate" predates React Query. It is an HTTP `Cache-Control` directive and the namesake of the `swr` library. React Server Components have their own request-scoped `fetch` dedup and cache. So when someone says "React dedupes this," pin down the layer: RSC dedup is per-request on the server, React Query dedup is client cache, and a bare client `useEffect` fetch dedupes nothing.

Recap: keying data by its input gives you one shared cache entry plus one in-flight promise (dedup), and returning cached-then-refetch gives instant paint (SWR). Bespoke `useEffect` fetches get neither.

#### See it live

**Demo (react-demo):** mount 3 badges using the same query key at once, then remount after `staleTime`, with a live request counter and a stale badge.

The widget renders a **Request counter** at the top (a number that increments each time `queryFn` actually hits the network) and a row of three `UserBadge` cards. A **Mount all 3** button mounts them simultaneously; a **Remount** button unmounts and remounts them. Each card shows the user name and a small **STALE** badge plus a shimmer overlay while a background refetch is running. A `queryFn` is mocked with `setTimeout(300ms)` and bumps the counter on every real call.

```tsx
let networkCalls = 0;

const fetchUser = (id: string) =>
  new Promise<{ id: string; name: string }>((res) => {
    networkCalls++;                       // counter increments only on a real call
    setTimeout(() => res({ id, name: `User ${id}` }), 300);
  });

function UserBadge({ id }: { id: string }) {
  const { data, isFetching, isStale } = useQuery({
    queryKey: ["user", id],
    queryFn: () => fetchUser(id),
    staleTime: 5000,
  });
  return (
    <div className={isFetching ? "shimmer" : ""}>
      {data?.name ?? "…"} {isStale && <span className="badge">STALE</span>}
    </div>
  );
}
// Widget mounts <UserBadge id="7" /> three times and shows `networkCalls`.
```

**Watch:** mount all three and the request counter reads **1**, not 3: the three badges share one in-flight promise (dedup). Click **Remount** before 5s and the counter stays 1 with data appearing instantly (fresh cache, no refetch). Remount after 5s and the badges paint the cached name **immediately** while the shimmer runs and the counter ticks to 2: cached-then-revalidate. This is a real client-side React Query cache, not an approximation.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Replace the bespoke `useEffect` fetch hook below with `useQuery` keyed by input, then explain how two components sharing one request produce one network call and how a warm remount renders instantly.

```tsx
function useUser(id) {
  const [user, setUser] = useState(null);
  useEffect(() => {
    fetch(`/api/users/${id}`).then(r => r.json()).then(setUser);
  }, [id]);
  return user;
}
```

**Think about:**
- Why does keying by input dedupe mounts?
- What is stale-while-revalidate?
- What must the query key include?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

```tsx
function useUser(id: string) {
  return useQuery({
    queryKey: ["user", id],
    queryFn: () => fetch(`/api/users/${id}`).then(r => r.json()),
    staleTime: 30_000,
  });
}
```

Why, at the mechanism level: the original hook stores state in each component instance's own closure, so N mounts equal N `useState` cells, N effects, and N `fetch` calls. React never coordinates them; there is no shared registry of "in-flight requests for `/api/users/7`." `useQuery` moves ownership out of the component into a single `QueryCache` keyed by `["user", id]`. When the second and third `UserBadge` mount with the same key while the first request is pending, they attach as observers to the existing entry and its one in-flight promise instead of starting their own. That is dedup. Stale-while-revalidate is the second half: on a warm remount, the observer reads the cached value from the cache entry synchronously in its first render, so the component paints real data with zero spinner, and only then does React Query dispatch a background refetch if the entry is older than `staleTime`.

The query key must include every input the `queryFn` closes over. Here that is `id`. If the fetch also depended on a tenant or locale, those go in the key too, otherwise two different inputs collapse into one cache entry and you serve the wrong tenant's data from cache.

How to spot it in review: any `useState` + `useEffect(fetch)` pair, especially a hook named `useSomething` that returns `{ data, loading }` and re-fetches on mount. That is client state pretending to be server state.

Production symptom: request storms (the same endpoint hit three-plus times on one screen paint) and spinners flashing on every navigation where cached data should have appeared instantly. You see it in the Network tab as duplicate in-flight requests to one URL.

Common misconception: "React dedupes client fetches for me." It does not. Request-scoped dedup exists in React Server Components (server side, per request) and in query libraries (client cache). A bare `useEffect` fetch has neither.

**Self-check rubric:**
- [ ] Replaced `useState`/`useEffect` with `useQuery({ queryKey, queryFn })`.
- [ ] Query key includes `id` (and would include any other input the fetch reads).
- [ ] Explained dedup as observers sharing one cache entry and one in-flight promise.
- [ ] Explained SWR as cached-synchronously-then-background-refetch.
- [ ] Named the symptom (duplicate requests + reappearing spinners) and corrected the "React auto-dedupes" misconception.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Feature-flag panel storm. On the dashboard, twelve widgets each call `useFeatureFlags(orgId)` (a `useEffect` fetch to `/api/flags?org=…`). The dashboard makes twelve identical requests on every load, and the flags endpoint is rate-limited to 100 req/min, so heavy users get 429s and blank widgets. Rewrite the hook so the twelve widgets share one request, and explain what happens on the next dashboard visit two seconds later.

**Model answer (revealed on demand):**

```tsx
function useFeatureFlags(orgId: string) {
  return useQuery({
    queryKey: ["flags", orgId],
    queryFn: () => fetch(`/api/flags?org=${orgId}`).then(r => r.json()),
    staleTime: 60_000, // flags rarely change mid-session
  });
}
```

Mechanism: keying by `["flags", orgId]` collapses the twelve subscriptions onto one cache entry. The first widget to mount starts the in-flight promise; the other eleven attach as observers to it. Twelve widgets, one request. That takes the org from twelve requests per load to one, which is what unblocks the 429s: you were spending your rate-limit budget on self-inflicted duplicates.

The next visit two seconds later: the entry is well under the 60s `staleTime`, so React Query serves the cached flags synchronously and fires **no** network call at all. The widgets paint instantly with zero requests. Only after 60s does a remount trigger one background revalidation, and even then all twelve widgets share that single refetch.

Spot in review: any per-widget fetch of shared, org- or session-scoped config. Config that is identical for every consumer on the page is the textbook case for a shared cache key. Production symptom before the fix: intermittent 429s, blank widgets under load, and a Network tab showing a dozen identical `/api/flags` calls. Misconception to correct: raising the rate limit is the fix. The rate limit was fine; the client was manufacturing load. Fix the fan-out, not the ceiling.

### ajr-l7-staletime-vs-gctime: staleTime vs gcTime

- **id:** `ajr-l7-staletime-vs-gctime`  ·  **difficulty:** hard  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** react-query, caching

#### Learn

`staleTime` and `gcTime` sound interchangeable and are the single most confused pair in React Query. They control two unrelated axes: **freshness** (should I refetch?) and **retention** (should I keep this in memory?).

`staleTime` is how long a fetched result counts as **fresh**. While an entry is fresh, React Query suppresses its automatic refetch triggers: remount, window refocus, network reconnect. Once `staleTime` elapses, the entry is marked **stale**, and the next trigger fires a background refetch. Crucially, stale does not mean deleted or hidden. Stale data still renders instantly; stale only decides whether a refetch is allowed to run.

The default is `staleTime: 0`. Every entry is stale the instant it arrives. That is why a fresh install of React Query "refetches on every focus" and surprises people: with `staleTime: 0`, every remount and every tab refocus is eligible to refetch. That is correct for a live trading price and wasteful for a country list.

```tsx
useQuery({
  queryKey: ["countries"],
  queryFn: fetchCountries,
  staleTime: Infinity, // never refetches on its own; this list does not change
});
```

`gcTime` (garbage-collection time, called `cacheTime` in React Query v4) is how long an **unused** entry stays in the cache before eviction. "Unused" is the key word: an entry has **observers** (mounted components subscribed to it) or it does not. The `gcTime` countdown starts **only when the observer count drops to zero**, that is, when the last component using that data unmounts. If the countdown finishes before anything remounts, the data is dropped from memory and the next mount is a cold fetch. If something remounts first, the timer is cancelled and the data survives. Default `gcTime` is 5 minutes.

So the two knobs answer different questions:

- `staleTime`: while mounted (or on remount within retention), do I refetch? Freshness.
- `gcTime`: after everyone unmounts, how long until I forget this? Retention.

They compose. A common correct config for slowly-changing data:

```tsx
useQuery({
  queryKey: ["user", id],
  queryFn: () => fetchUser(id),
  staleTime: 60_000,   // 60s: no refetch on remount/focus within a minute
  gcTime: 300_000,     // 5min: keep it in memory 5 min after the last consumer leaves
});
```

Read that as: for 60 seconds this data is fresh, so navigating away and back paints instantly with no request. Separately, if every component using it unmounts, hold the bytes for 5 more minutes in case the user comes back, then evict.

Interview nuance: `gcTime` should generally be `>= staleTime`. A `gcTime` shorter than `staleTime` means you throw away data while it is still considered fresh, so a quick remount refetches anyway and the freshness window never pays off. Also note `gcTime` only ticks with zero observers: a permanently-mounted query is never garbage collected regardless of `gcTime`, because its observer count never hits zero.

Recap: `staleTime` gates refetch triggers (freshness); `gcTime` evicts data only while it has zero active observers (retention). They are orthogonal, and `staleTime: 0` (the default) is why untuned apps refetch constantly.

#### See it live

**Demo (react-demo):** two timelines under a mounted query, a `staleTime` bar and a `gcTime` bar, with mount/unmount and remount controls.

The widget shows one query and two horizontal progress bars. The **staleTime bar** fills from green (fresh) to amber (stale) over the configured `staleTime` while the query is mounted, and a **Remount** button next to it shows "refetched" only when clicked in the amber zone. The **gcTime bar** is greyed out and empty while the query has observers; an **Unmount** button drops the last observer, at which point the gcTime bar starts counting down. A **Remount** during the countdown cancels it (bar resets to inactive); letting it finish flips a label to "evicted (next mount is cold)."

```tsx
useQuery({
  queryKey: ["demo"],
  queryFn: fetchDemo,
  staleTime: 5000,   // green for 5s, then amber (stale)
  gcTime: 8000,      // countdown starts only after Unmount
});
// Controls: [Mount] [Unmount last observer] [Remount]
// staleTime bar: fresh -> stale while mounted
// gcTime bar: inert while observers > 0; counts down only after last unmount
```

**Watch:** while mounted, the staleTime bar flips fresh to stale at 5s, and **Remount refetches only when the bar is amber**, proving `staleTime` gates the refetch. The gcTime bar sits inert the whole time the query is mounted, proving retention has nothing to do with freshness. Click **Unmount** and the gcTime countdown starts; remount before 8s and it cancels (data survives), or let it finish and the next mount is a cold fetch. This is a real React Query instance with mocked timers, not a hand-drawn animation.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Configure the query so cached data shows with no refetch for 60s on remount and focus, yet the entry is garbage-collected 5 minutes after the last consumer unmounts. State which knob does which and what the default `staleTime` would have caused.

```tsx
useQuery({
  queryKey: ["order", orderId],
  queryFn: () => fetchOrder(orderId),
  // TODO: 60s no-refetch window + 5min retention after last unmount
});
```

**Think about:**
- Which knob suppresses refetch on remount/focus?
- When does the gcTime timer run?
- What does `staleTime: 0` (default) cause?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

```tsx
useQuery({
  queryKey: ["order", orderId],
  queryFn: () => fetchOrder(orderId),
  staleTime: 60_000,   // freshness: no auto-refetch for 60s
  gcTime: 300_000,     // retention: evict 5min after the last observer unmounts
});
```

Why, at the mechanism level: `staleTime: 60_000` marks the entry fresh for 60 seconds after it resolves. While fresh, React Query's refetch triggers (remount, window refocus, reconnect) are suppressed, so navigating away and back within a minute reads the cache and paints instantly with no network call. `gcTime: 300_000` is a separate timer that does not start until the entry's observer count hits zero, that is, until the last component using `["order", orderId]` unmounts. During those 5 minutes the data sits in memory unused; a remount before the timer fires cancels it and reuses the bytes, while letting it finish evicts the entry so the next mount is cold.

These are orthogonal. `staleTime` never deletes anything; it only decides whether a refetch is allowed. `gcTime` never refetches anything; it only decides when to forget. That is why both are needed here: one to stop needless refetches for a minute, one to hold the data for five minutes after everyone leaves.

The default `staleTime: 0` would mark the order stale the instant it loads, so every remount and every tab refocus would fire a background refetch. On an order-detail page that a user tabs in and out of, that is a refetch storm: constant requests and flickering `isFetching` states for data that has not changed.

How to spot it in review: `staleTime: 0` (or omitted) on data that changes slowly, and conversely a huge `staleTime` on data expected to be live. Also watch for `gcTime < staleTime`, which throws data away while it is still fresh.

Production symptom of getting it wrong: either constant background refetches (over-fresh) or a screen that never updates until a hard reload (over-cached). Common misconception: `staleTime` and `gcTime` are the same knob with different names. They are two axes: refetch-gating versus memory-eviction.

**Self-check rubric:**
- [ ] `staleTime: 60_000` for the no-refetch window.
- [ ] `gcTime: 300_000` for post-unmount retention.
- [ ] Stated that `staleTime` gates refetch triggers and `gcTime` counts down only at zero observers.
- [ ] Explained the default `staleTime: 0` causes refetch-on-every-focus/remount.
- [ ] Noted the two knobs are orthogonal (freshness vs retention), not the same setting.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Dashboard tab-switch thrash. An analytics dashboard has five heavy chart queries (each a 1.5s aggregation). Users tab between the dashboard and Slack constantly, and every return refetches all five charts, spiking the warehouse and freezing the UI with spinners. Meanwhile a permanently-pinned "org header" query with `gcTime: 1000` is expected to be evicted quickly but never is. Fix both and explain the observer mechanic.

**Model answer (revealed on demand):**

```tsx
// Heavy charts: fresh for 5 min, refetch on demand only
useQuery({ queryKey: ["chart", id], queryFn: fetchChart, staleTime: 300_000, gcTime: 600_000 });

// Pinned org header: never unmounts, so gcTime is irrelevant
useQuery({ queryKey: ["org", orgId], queryFn: fetchOrg, staleTime: Infinity });
```

Mechanism: the thrash is `staleTime: 0` meeting React Query's `refetchOnWindowFocus`. Every Slack-to-dashboard switch is a focus event, and with zero freshness every chart is stale, so all five refetch at once. Raising `staleTime` to 5 minutes makes the returns cache hits: focus fires, the entries are still fresh, no refetch runs, the UI paints from cache. The warehouse load and the spinner freeze both disappear.

The org-header puzzle is the observer rule made concrete. `gcTime: 1000` only starts counting when the observer count reaches zero, but a permanently-pinned header never unmounts, so its observer count never drops to zero and the timer never starts. The data lives forever no matter how small `gcTime` is. That is not a bug; `gcTime` governs unused entries only. The right lever for a never-changing header is `staleTime: Infinity` so it also never refetches, and to just accept it stays resident because it is always on screen.

Spot in review: heavy queries with default `staleTime` on a focus-heavy surface, and any expectation that `gcTime` evicts a still-mounted query. Production symptom: warehouse cost spikes and multi-second UI freezes correlated with tab focus, plus "why is this never garbage collected" confusion. Misconception corrected: `gcTime` does not evict mounted data; only zero-observer entries are eligible.

### ajr-l7-keep-previous-data: Losing previous data on refetch (pagination flicker)

- **id:** `ajr-l7-keep-previous-data`  ·  **difficulty:** medium  ·  **est:** 10 min  ·  **demo:** react-demo  ·  **skills:** react-query, pagination, ux

#### Learn

Paginated and filtered lists have a UX bug baked into naive React Query usage, and it comes straight from how query keys work. Every distinct key is a distinct cache entry with its own lifecycle. Page 1 is `["orders", 1]`; page 2 is `["orders", 2]`. They are unrelated entries as far as the cache is concerned.

So watch what happens when the user clicks "Next":

```tsx
function OrdersTable({ page }: { page: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["orders", page],
    queryFn: () => fetchOrders(page),
  });
  if (isLoading) return <Spinner />;      // fires on EVERY page change
  return <Table rows={data ?? []} />;      // data is undefined between pages
}
```

Changing `page` from 1 to 2 switches the observer to key `["orders", 2]`, which has **never been fetched**. Its cached data is `undefined`, so `isLoading` is `true` and `data ?? []` is an empty array. The table blanks to a full-page spinner, then the rows for page 2 arrive and the table snaps back. Because an empty table is shorter than a full one, the surrounding layout jumps up and back down. That is a cumulative layout shift (CLS) and a scroll jump on every single page or filter change. It feels broken even though the data is loading correctly.

The fix in React Query v5 is `placeholderData: keepPreviousData`:

```tsx
import { keepPreviousData } from "@tanstack/react-query";

const { data, isPlaceholderData } = useQuery({
  queryKey: ["orders", page],
  queryFn: () => fetchOrders(page),
  placeholderData: keepPreviousData,
});
```

While the new key loads, React Query serves the **previous key's data** as placeholder data instead of `undefined`. The table keeps showing page 1's rows, so there is no blank, no spinner, no layout jump. The `isPlaceholderData` flag is `true` during this window, which you use to dim the table or disable the pager, then it flips to `false` when the real page-2 data swaps in. The rows change in place, the height stays stable.

(In React Query v4 this was the `keepPreviousData: true` boolean option. v5 unified it into `placeholderData`, which also accepts a function of the previous data.)

Interview nuance: this is the data-fetching twin of a pure-React concern the interviewer may probe. `useDeferredValue` and `startTransition` solve the same "do not blank the old UI while the new one is computing" problem for **client-side** derived state (filtering a big list, an expensive re-render). React marks the transition non-urgent and keeps the previous render on screen until the new one is ready, exactly as `keepPreviousData` keeps the previous page's rows until the next fetch resolves. One is for in-flight network data, the other for in-flight rendering, and both exist so the user never stares at a blank where content used to be.

Recap: a new query key is a cold entry (`undefined` until it loads), so pagination naively flashes a spinner and jumps layout. `placeholderData: keepPreviousData` holds the last page's rows (dimmed via `isPlaceholderData`) until the next page swaps in, and its client-render analog is `useDeferredValue`/`startTransition`.

#### See it live

**Demo (react-demo):** a paginated table with a toggle for `keepPreviousData` / `placeholderData`.

The widget renders a fixed-height table of orders with **Prev** / **Next** buttons and a **keepPreviousData** toggle. With the toggle **off**, clicking Next blanks the table to a centered spinner and the container height collapses, so you see a visible layout jump before page 2 renders. With the toggle **on**, clicking Next keeps page 1's rows on screen at reduced opacity (driven by `isPlaceholderData`), the height never changes, and the rows swap to page 2 in place when the fetch resolves. A mocked `fetchOrders(page)` uses `setTimeout(600ms)` so the loading window is clearly visible.

```tsx
const { data, isPlaceholderData } = useQuery({
  queryKey: ["orders", page],
  queryFn: () => fetchOrders(page),          // setTimeout 600ms mock
  placeholderData: keepPredOn ? keepPreviousData : undefined,
});

return (
  <table style={{ opacity: isPlaceholderData ? 0.5 : 1 }}>
    {(data ?? []).map(row => <Row key={row.id} {...row} />)}
  </table>
);
// Toggle keepPredOn; buttons change `page`.
```

**Watch:** toggle **off** and Next flashes a spinner with a layout jump (the empty-state proof that `["orders", 2]` is a cold `undefined` entry). Toggle **on** and Next keeps the old rows dimmed with a stable height until the new rows swap in, proving `keepPreviousData` serves the previous key's data as placeholder. This is a real React Query cache with mocked timers.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Add `placeholderData: keepPreviousData` so the paginated table below never blanks between pages, dim the UI while the placeholder is showing, and name the client-side rendering equivalent of this technique.

```tsx
function OrdersTable({ page }) {
  const { data, isLoading } = useQuery({
    queryKey: ["orders", page],
    queryFn: () => fetchOrders(page),
  });
  if (isLoading) return <Spinner />;
  return <Table rows={data ?? []} />;
}
```

**Think about:**
- Why does a new page key show a spinner?
- What flag indicates placeholder data?
- What is the `useDeferredValue` / `startTransition` analog?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

```tsx
import { keepPreviousData } from "@tanstack/react-query";

function OrdersTable({ page }: { page: number }) {
  const { data, isPlaceholderData } = useQuery({
    queryKey: ["orders", page],
    queryFn: () => fetchOrders(page),
    placeholderData: keepPreviousData,
  });
  return (
    <Table
      rows={data ?? []}
      style={{ opacity: isPlaceholderData ? 0.5 : 1 }}
    />
  );
}
```

Why, at the mechanism level: each `page` value produces a different `queryKey`, and each key is an independent cache entry. When `page` changes to a value never fetched, the observer points at a cold entry whose data is `undefined` and whose status is loading, so the original code's `isLoading` guard renders a spinner and `data ?? []` renders nothing. `placeholderData: keepPreviousData` changes what the observer sees while the new key loads: instead of `undefined`, React Query returns the data from the previously observed key as placeholder data. The component keeps rendering the old rows, so there is no blank frame. During that window `isPlaceholderData` is `true`, which you bind to opacity (or a disabled pager) to signal "loading, but here is the last page." When the real fetch resolves, the entry gets its true data, `isPlaceholderData` flips to `false`, and the rows swap in place at the same height.

How to spot it in review: a query keyed by `page` (or a filter, or a search term) that reads `data ?? []` and shows a spinner on `isLoading`. Any list where the key changes on user interaction is a candidate. The tell is a full-width `<Spinner />` early return inside a paginated view.

Production symptom: the table blanks to a spinner and the page height collapses on every page, filter, or sort change, producing a cumulative layout shift and a scroll jump. Users perceive it as flicker and lost place.

The client-side rendering analog is `useDeferredValue` / `startTransition`. Those keep the previous rendered output on screen while React computes an expensive new render off the urgent path, exactly as `keepPreviousData` keeps the previous page's data while the next fetch is in flight. Network placeholder versus render deferral, same "never show a blank where content was" goal.

Common misconception: you must show a spinner while the next page loads. You do not. Keeping the previous data dimmed is both valid and better UX for pagination and filtering.

**Self-check rubric:**
- [ ] Added `placeholderData: keepPreviousData`.
- [ ] Removed the blanking spinner and used `isPlaceholderData` to dim/disable instead.
- [ ] Explained a new key is a cold `undefined` entry until it loads.
- [ ] Named the production symptom (CLS / layout jump / scroll jump on page change).
- [ ] Named `useDeferredValue` / `startTransition` as the client-render analog.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Infinite-scroll search with a filter bar. A product search page has a debounced text input plus category and price-range filters; every keystroke and filter toggle changes the query key and blanks the entire results grid to a spinner, so typing "wireless headphones" flashes the grid seven times. Keep results stable across every keystroke and filter change, and say how you would signal in-flight state without blanking, plus one edge case `keepPreviousData` does not solve.

**Model answer (revealed on demand):**

```tsx
const { data, isPlaceholderData, isFetching } = useQuery({
  queryKey: ["search", debouncedTerm, category, priceRange],
  queryFn: () => searchProducts({ debouncedTerm, category, priceRange }),
  placeholderData: keepPreviousData,
});

// Results grid at reduced opacity while placeholder is shown,
// plus a thin top progress bar keyed off isFetching.
<Grid items={data?.items ?? []} style={{ opacity: isPlaceholderData ? 0.6 : 1 }} />
```

Mechanism: the key here is composite, `["search", term, category, priceRange]`, so any of the four inputs changing mints a new cold entry. Without placeholder data, each keystroke swaps to an `undefined` entry and blanks the grid, hence seven flashes for a seven-effective-keystroke term (debouncing reduces but does not eliminate this). `keepPreviousData` holds the last resolved result set on screen across every one of those key changes, so the grid stays populated and only its contents update when each search resolves. Signal in-flight state two ways that do not blank: dim the grid via `isPlaceholderData`, and show a slim indeterminate progress bar driven by `isFetching` so the user knows a newer query is running.

The composite key also fixes correctness: including `category` and `priceRange` in the key means filtered results cache and dedupe per combination, so returning to a prior filter is instant.

Edge case `keepPreviousData` does not solve: the **first** query has no previous data, so the very first search (or a hard reload on a filtered URL) still shows an empty/loading state; there is nothing to hold over. Handle that with an explicit skeleton on `isLoading && !isPlaceholderData`. It also does not fix a genuinely slow backend; it hides the transition, not the latency. Spot in review: composite-key searches that early-return a spinner. Production symptom: strobing results grid while typing and on every filter click. Misconception corrected: debouncing alone fixes the flicker. Debouncing cuts the number of fetches; only placeholder data stops the blank between them.

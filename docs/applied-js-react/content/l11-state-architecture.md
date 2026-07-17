> Module **11.4** (State Architecture) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [11.3](./l11-concurrency-production.md) · Next: [11.5](./l11-reliability-testing.md)

# L11 · State Architecture

Most "state management" pain is a classification error: teams pour fetched server data into Redux or Context and then hand-roll caching, deduping, and revalidation that a query cache or the framework already does for free. After this module you can catch two production-grade mistakes on sight: server data living in a client store where it goes stale and refetches in storms, and Next.js App Router pages that ship stale reads or accidental dynamic rendering because their caching intent was never made explicit.

### ajr-l11-server-vs-client-state: Server state is not client state

- **id:** `ajr-l11-server-vs-client-state`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** react, state-management, architecture

#### Learn

The single most useful question in React architecture is: **who owns the source of truth for this value?** There are four answers, and each one has a correct home.

- **Server state** is a cached copy of data that actually lives on a server: the user list, the current cart, a document. You do not own it. It can change without you, so your local copy is always potentially stale and needs revalidation, deduping, and garbage collection.
- **UI state** is genuinely local: is this dropdown open, which tab is active, what is typed in an uncontrolled draft. It has no server truth. `useState` owns it.
- **Global client state** is app-wide but still client-owned: theme, feature flags, a wizard's cross-step selections. A store (Zustand, Redux, Context) owns it.
- **URL state** is anything that should survive a refresh or be shareable: filters, pagination, the selected id. The URL owns it.

The classic mistake is treating server state as if it were global client state. Here is the shape that ships everywhere:

```tsx
function useUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/users")
      .then((r) => r.json())
      .then(setUsers)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []); // fires per mounting component, no dedupe, no revalidation

  return { users, loading, error };
}
```

Every component that calls this owns a private copy of the list. Mount the same hook in two panels and you fire two identical requests. Nothing revalidates after a mutation, so the moment someone edits a user the screen is stale until a full reload. Put that same list in Redux and you have not fixed anything: you have just centralized the stale copy and now you are also hand-writing cache keys, invalidation, and loading flags.

A query cache flips the ownership model. You describe the data with a key and a fetcher, and the library owns the cache:

```tsx
function useUsers() {
  return useQuery({ queryKey: ["users"], queryFn: () => fetch("/api/users").then((r) => r.json()) });
}
```

Now two panels with the same key share one in-flight request (dedupe) and one cache entry. The library revalidates on focus or interval, garbage-collects unused entries, and after a mutation you call `invalidateQueries(["users"])` and every consumer updates. In an RSC world the server component simply fetches and React's request memoization dedupes within the render.

Interview nuance: the tell of a strong candidate is refusing "put it in Redux" as a reflex answer and instead classifying first. Say "that is server state, it belongs in a query cache, not the store." Redux is for client state that has no server truth.

Recap: classify every value as server, UI, global-client, or URL state. Server state is a revalidating cache of remote data, so it belongs in a query cache or RSC, not a client store. Over-centralizing into one global store buys you stale copies plus a hand-rolled cache you now have to maintain.

#### See it live

**Demo (react-demo):** two panels render the same user list side by side, one built on `useState + useEffect` with manual flags and no dedupe, one built on a shared query cache, with a global request counter at the top.

Widget: a top bar shows "Network requests: N" and three buttons: "Mount second panel", "Edit user #1 (mutation)", and "Refocus window". Below are two columns. Left column is labeled "useState + useEffect" and renders the list plus a small "fetched at HH:MM:SS" timestamp per panel instance. Right column is labeled "Query cache" and renders the same list and timestamp. Each panel instance increments the shared request counter when it actually hits the network.

```tsx
// LEFT: manual. Each instance owns its own state and fires its own request.
function ManualPanel({ onRequest }: { onRequest: () => void }) {
  const [users, setUsers] = useState<User[]>([]);
  useEffect(() => {
    onRequest();                 // counter++ : no dedupe
    fetchUsers().then(setUsers); // mock: setTimeout-backed
  }, []);
  return <UserList users={users} stamp={useMemo(() => Date.now(), [users])} />;
}

// RIGHT: shared cache keyed by ["users"]; second mount reuses the in-flight request.
function CachedPanel() {
  const { data } = useQuery({ queryKey: ["users"], queryFn: fetchUsersCounted });
  return <UserList users={data ?? []} stamp={data?.fetchedAt} />;
}
```

**Watch:** Click "Mount second panel" and watch the counter. The left side jumps by two (each manual panel fetches independently), while the right side jumps by one (both cached panels share the `["users"]` entry and the in-flight request is deduped). Click "Edit user #1": the right panels update after `invalidateQueries`, while the left panels keep showing the pre-edit list with their old timestamps until you force a remount. This is a real React demo, not a simulation; the "network" is a `setTimeout`-backed mock so requests are deterministic, but the dedupe, shared cache, and post-mutation revalidation are the actual query-cache behavior.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Rewrite the server-data portion of this component to use a query cache (React Query / SWR) or RSC, keeping only genuine UI state local, and say why the original produced duplicate fetches and stale reads.

```tsx
function Dashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null); // UI/URL state
  const [panelOpen, setPanelOpen] = useState(false);   // UI state

  useEffect(() => {
    setLoading(true);
    fetch("/api/users").then((r) => r.json()).then(setUsers).finally(() => setLoading(false));
  }, []);

  async function rename(id, name) {
    await fetch(`/api/users/${id}`, { method: "PATCH", body: JSON.stringify({ name }) });
    // ...now what? the list is stale
  }
  // ...
}
```

**Think about:**
- How do you classify a piece of state?
- What does a query cache give you for free?
- What does over-centralizing cause?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

Classify first. `users` and `loading` describe a cached copy of remote data, so they are server state. `selectedId` should survive refresh and be shareable, so it is URL state. `panelOpen` is genuine UI state. Only the last stays in `useState`.

```tsx
function Dashboard() {
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => fetch("/api/users").then((r) => r.json()),
  });
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("user");
  const [panelOpen, setPanelOpen] = useState(false);

  const queryClient = useQueryClient();
  const rename = useMutation({
    mutationFn: ({ id, name }) =>
      fetch(`/api/users/${id}`, { method: "PATCH", body: JSON.stringify({ name }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
  // ...
}
```

Why at the mechanism level: server state is not owned by the component. It is a local cache of a remote source that can change independently, so the two properties you must have are deduplication (one shared in-flight request and cache entry per key) and revalidation (a defined way to mark the cache stale after a write). `useState + useEffect` gives you neither: each mount is a private copy, and after `rename` resolves nothing tells the list to refetch, so the UI shows the old name until a full reload. Wiring `invalidateQueries` marks `["users"]` stale and every consumer refetches once.

How to spot it in review: fetched data held in `useState`, Redux, or Context alongside a hand-rolled `loading`/`error` flag, and especially a mutation function that awaits a write and then does nothing to refresh the reads. Grep for `setUsers`, `dispatch(setData(...))` after a fetch, and PATCH/POST calls with no invalidation nearby.

Production symptom: refetch storms (the same endpoint hit N times because N components each own the fetch), stale reads after writes (edit succeeds, screen does not update), and re-render storms if that data sits in one fat store that a large subtree subscribes to.

Common misconception: "shared state belongs in one global store." Shared server state belongs in a query cache keyed by identity; the store is for client state that has no server truth. Centralizing server data does not remove the caching problem, it just makes you re-implement the query cache by hand.

**Self-check rubric:**
- [ ] Each piece of state is labeled server, UI, global-client, or URL before choosing a home.
- [ ] Server data moved to a query cache / RSC keyed by a stable key, not `useState`/Redux.
- [ ] The mutation revalidates (invalidateQueries / revalidate) rather than leaving reads stale.
- [ ] Genuine UI state (`panelOpen`) stayed local; shareable state (`selectedId`) moved toward the URL.
- [ ] The answer names dedupe and revalidation as the two properties a query cache provides.

#### Practice: real-world variant (save, then reveal)

**Prompt:** "Notifications bell" incident. A product ships an unread-notifications count in a Redux slice, hydrated once on login by a thunk that fetches `/api/notifications`. Support reports two bugs: the badge stays at "3" for minutes after a user reads everything on another tab, and on the dashboard the count endpoint is hit six times on every navigation. Diagnose both from the architecture, then propose the fix and one thing you would keep in Redux.

**Model answer (revealed on demand):**

Both bugs come from storing server state (the count, which lives on the server and changes independently, including from other tabs and devices) in a client store that has no revalidation model. The Redux slice is a single snapshot captured at login. Nothing marks it stale, so reading notifications elsewhere never updates this tab: that is the stuck "3". The six requests per navigation are the mirror image: several dashboard widgets each dispatch the hydration thunk on mount because there is no shared cache key to dedupe against, so N mounts equal N fetches.

Fix: move the count to a query cache entry, `useQuery({ queryKey: ["notifications", "unread"], queryFn, staleTime, refetchOnWindowFocus: true })`. Now every widget that reads the count shares one cache entry and one in-flight request (the six requests collapse to one), and `refetchOnWindowFocus` plus a `staleTime` revalidate the badge when the user returns to the tab. When the user reads notifications, the mutation calls `invalidateQueries({ queryKey: ["notifications"] })` so the badge updates immediately instead of drifting. For true cross-tab or cross-device freshness you would add a websocket or SSE push that invalidates the same key.

What stays in Redux: genuine client state with no server truth, for example whether the notifications panel is pinned open, the user's chosen sort order for the panel, or an optimistic "marking as read" in-flight flag if you want it app-wide. The rule holds: server state to the query cache keyed by identity, client-only state to the store.

The misconception to correct out loud: "it is shared across the app, so it belongs in the global store." Shared and server-owned are different axes. The count is shared, but its source of truth is the server, so it needs a revalidating cache, not a one-shot snapshot.

### ajr-l11-caching-revalidation-nextjs: Next.js App Router caching and revalidation

- **id:** `ajr-l11-caching-revalidation-nextjs`  ·  **difficulty:** hard  ·  **est:** 14 min  ·  **demo:** react-demo  ·  **skills:** nextjs, caching, revalidation

#### Learn

The App Router does not have "a cache." It has a stack of four caches, each with a different key, lifetime, and location, and stale data or accidental dynamic rendering ships when you never state your intent at any layer. From closest-to-render outward:

1. **Request Memoization** dedupes identical `fetch` calls within a single render pass. Same URL and options in two components equals one request. It lives for one server render only.
2. **Data Cache** persists `fetch` results on the server across requests and deploys. This is the layer that serves a value fetched yesterday. It is keyed by URL and options and busted by `revalidateTag` / `revalidatePath` or `next.revalidate` time.
3. **Full Route Cache** stores the rendered HTML and RSC payload of a statically-rendered route at build time. If a route is static, users get this prebuilt output.
4. **Router Cache** is the client-side cache of RSC payloads for navigated routes, so back/forward is instant. It is short-lived and per-session.

A stale read after a write is almost always the **Data Cache** (or a route frozen in the **Full Route Cache**) serving a value your mutation never invalidated. Here is the trap:

```tsx
// app/products/page.tsx  (Next 14 behavior: fetch is cached by DEFAULT)
async function ProductsPage() {
  const products = await fetch("https://api.example.com/products") // cached forever until revalidated
    .then((r) => r.json());
  return <List items={products} />;
}
```

In Next 14 this route is static and that `fetch` is cached indefinitely, so after someone adds a product the page keeps showing the old list. The caching intent here is implicit: you never said how fresh this should be. Make it explicit with a tag, then bust exactly that tag in the mutation:

```tsx
// read
const products = await fetch("https://api.example.com/products", {
  next: { tags: ["products"] },
}).then((r) => r.json());

// server action / route handler that writes
"use server";
export async function addProduct(data: FormData) {
  await db.products.create(/* ... */);
  revalidateTag("products"); // busts the Data Cache entry AND dependent route cache
}
```

Interview nuance: the defaults are not stable across versions, and naming this is a strong signal. Next 14 caches `fetch` by default (opt out with `cache: "no-store"` or `revalidate`). Next 15 flipped `fetch` and route handlers to **uncached by default**, so the surprise inverted: routes silently went dynamic and lost static performance. Next 16 leans on explicit Cache Components (`use cache`, `cacheLife`, `cacheTag`) so caching is opt-in and intentional. If you say "it depends on the Next version" and then say which way, you have shown you actually operate this in production.

What makes a route accidentally dynamic: reading `cookies()`, `headers()`, or `searchParams`, or using `cache: "no-store"`, opts the whole route out of static rendering. One stray `headers()` call in a deep component can flip a page from prebuilt to rendered-per-request and quietly tank your performance.

Recap: four layers (Request Memoization, Data Cache, Full Route Cache, Router Cache). Stale-after-write is usually the Data Cache or Full Route Cache. Make intent explicit with tags / `cacheLife` and bust it with `revalidateTag` in the mutating action. Caching defaults changed across 14/15/16, and dynamic APIs can flip a route dynamic by accident.

#### See it live

**Demo (react-demo):** a single request flows left to right through the four cache layers (Request Memoization then Data Cache then Full Route Cache then Router Cache), each drawn as a box with an on/off toggle and a "data age" badge, and a "Run mutation (revalidateTag: products)" button that busts exactly one layer.

Widget: four labeled boxes in a row. Each box shows HIT or MISS for the current request and an age badge like "age: 42s". A "Send request" button pushes an animated token through the boxes; it stops at the first box that reports HIT and that box's age badge is what the user "sees." A "revalidateTag('products')" button flashes the Data Cache and Full Route Cache boxes and resets their age to 0. A mode dropdown switches "Next 14 (fetch cached by default)" vs "Next 15 (uncached by default)" vs "force-dynamic", changing which boxes start as HIT.

```tsx
// The demo models each layer as a small state machine.
type Layer = { name: string; enabled: boolean; ageMs: number; hit: boolean };

// A request walks the layers and is served by the first HIT.
function serve(layers: Layer[]): { servedBy: string; ageMs: number } {
  const box = layers.find((l) => l.enabled && l.hit);
  return box ? { servedBy: box.name, ageMs: box.ageMs } : { servedBy: "origin", ageMs: 0 };
}

// revalidateTag("products") resets the tagged layers only.
function revalidateTag(layers: Layer[], tagged: string[]) {
  return layers.map((l) => (tagged.includes(l.name) ? { ...l, ageMs: 0, hit: false } : l));
}
```

**Watch:** In "Next 14" mode, click "Send request": the token stops at the Data Cache box and the age badge shows a large number, proving that layer, not the origin, served the stale value. Click "revalidateTag('products')": only the Data Cache and Full Route Cache boxes flash and reset to age 0, while Request Memoization and Router Cache are untouched, proving the tag busts exactly the layers it is wired to and no more. Switch to "force-dynamic" mode and every box shows MISS, so the token reaches the origin every time (fresh, but no static perf). This is an interactive React model of the layering, not the real Next.js runtime: the boxes are state machines, so treat it as an accurate mental model of which layer serves stale data and what `revalidateTag` busts, not a live Next server.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Fix a page that shows stale data after a write because it was statically cached. Make the caching intent explicit (tags / `cacheLife`, or force dynamic if it truly must be) and wire `revalidateTag` into the mutating action, then explain which cache layer was serving the stale read.

```tsx
// app/products/page.tsx
export default async function ProductsPage() {
  const products = await fetch("https://api.example.com/products").then((r) => r.json());
  return <ProductList items={products} />;
}

// app/actions.ts
"use server";
export async function addProduct(form: FormData) {
  await fetch("https://api.example.com/products", { method: "POST", body: form });
  // returns, page still shows the old list
}
```

**Think about:**
- Which cache layer usually serves stale data?
- How did caching defaults change across Next 14/15/16?
- What makes a route accidentally dynamic?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The stale value is coming from the **Data Cache** (and, because the route is static, the **Full Route Cache** holding the prebuilt output). In Next 14 an unadorned `fetch` is cached indefinitely and the route is statically rendered, so `addProduct` writes to the origin but the read layer is never told its copy is now wrong. Make the intent explicit on the read and bust exactly that tag on the write:

```tsx
// app/products/page.tsx : explicit freshness intent
export default async function ProductsPage() {
  const products = await fetch("https://api.example.com/products", {
    next: { tags: ["products"], revalidate: 60 }, // or Next 16: "use cache" + cacheTag("products")
  }).then((r) => r.json());
  return <ProductList items={products} />;
}

// app/actions.ts : the write now invalidates the read
"use server";
import { revalidateTag } from "next/cache";
export async function addProduct(form: FormData) {
  await fetch("https://api.example.com/products", { method: "POST", body: form });
  revalidateTag("products"); // marks the Data Cache entry stale and rebuilds dependent routes
}
```

Why at the mechanism level: `revalidateTag("products")` marks every Data Cache entry tagged `products` as stale and invalidates the Full Route Cache for routes that read it, so the next request re-fetches from origin and re-renders once. Without it, the tagged read has no relationship to the write, and both the Data Cache and the prebuilt route keep serving the pre-write snapshot until the time-based `revalidate` window elapses (or forever, if you set none).

How to spot it in review: a `fetch` in a server component with no `next` options or `cache` field (implicit intent), and a server action or route handler that performs a POST/PATCH/DELETE and never calls `revalidateTag` or `revalidatePath`. The pairing to look for is "write with no matching invalidation."

Production symptom: users add or edit data and the list does not update until a redeploy or the revalidate timer fires, support tickets about "my change disappeared," and the inverse failure, an accidental `cache: "no-store"` or a stray `cookies()`/`headers()` read flipping the whole route dynamic and erasing its static performance.

Common misconception: "fetch caching defaults are stable, so I do not need to be explicit." They are not. Next 14 caches `fetch` by default, Next 15 made `fetch` and route handlers uncached by default (routes silently went dynamic), and Next 16 makes caching opt-in via Cache Components. Relying on the default means your app's freshness behavior changes under you on a framework upgrade, which is exactly why you state the intent with tags or `cacheLife`.

**Self-check rubric:**
- [ ] The read declares explicit intent (`next: { tags, revalidate }` or `use cache` + `cacheTag`), not a bare `fetch`.
- [ ] The mutating action calls `revalidateTag` / `revalidatePath` for the exact tag it wrote.
- [ ] The answer names the Data Cache (and Full Route Cache) as the stale-serving layer, not Router Cache.
- [ ] The answer states that defaults differ across Next 14/15/16 and which way.
- [ ] Accidental dynamic causes (`cookies()`, `headers()`, `searchParams`, `no-store`) are identified.

#### Practice: real-world variant (save, then reveal)

**Prompt:** "Pricing page went dynamic" incident. After a Next 14 to 15 upgrade, an ecommerce team sees their p95 for `/pricing` jump from 40ms to 600ms and their CDN hit rate collapse, while a separate `/orders/[id]` page now shows a customer the *previous* customer's order for a split second on fast back-navigation. Diagnose each page's layer, explain what the upgrade changed, and give the fix for both.

**Model answer (revealed on demand):**

Two different layers, one shared root cause: implicit caching intent meeting changed defaults.

`/pricing` regressed because Next 15 flipped `fetch` and route handlers to **uncached by default**. The page relied on Next 14 caching its `fetch` and Full-Route-caching the result, so it was served from the CDN as static HTML. After the upgrade the same code opts into nothing, the `fetch` misses the Data Cache every time, the route renders per request, and it silently went dynamic. The p95 climbed because every hit now does a server render and origin fetch, and the CDN hit rate collapsed because there is no cacheable static output anymore. Fix: restore explicit intent. Add `next: { revalidate: 3600, tags: ["pricing"] }` to the fetch (or in Next 16, `"use cache"` with `cacheLife("hours")` and `cacheTag("pricing")`), and bust `pricing` from the admin action that changes prices. Also audit for a stray `headers()`/`cookies()` read that keeps it dynamic regardless.

`/orders/[id]` is a **Router Cache** problem, the client-side RSC payload cache. On fast back-navigation the client is briefly showing the cached payload for the previously visited order id before the fresh one resolves. For personalized, per-user, per-id data that must never leak across navigations, you do not want it sitting in a shared reusable client cache: mark the data dynamic and non-cacheable (`cache: "no-store"` on the fetch, or `cacheLife` set to not reuse across the id), and confirm the segment is keyed by the id so one order's payload can never render under another's route. The security framing matters: showing customer A's order to customer B is a data-exposure incident, not just a UX flicker.

The misconception to correct: "an upgrade cannot change my caching, my code did not change." The whole point of the 14 to 15 to 16 evolution is that the *defaults* moved, so code that leaned on an implicit default behaves differently after the bump. Explicit tags and `cacheLife` are what make caching survive a framework upgrade unchanged.

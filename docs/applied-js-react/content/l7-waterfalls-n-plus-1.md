> Module **7.1** (Waterfalls & N+1) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [6.5](./l6-effect-event-custom-hooks.md) · Next: [7.2](./l7-fetch-races-states.md)

# L7 · Waterfalls & N+1

Slow React pages are usually not slow because the network is slow. They are slow because the code asked for data one round-trip at a time when it could have asked all at once. After this module you can look at a component tree and predict its latency: spot the independent `await`s that serialize into a waterfall, spot the per-row fetch that explodes into N+1 requests, and rewrite both so total time tracks the slowest single call instead of the sum of all of them.

### ajr-l7-request-waterfall: Client-side request waterfalls

- **id:** `ajr-l7-request-waterfall`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** js-runnable  ·  **skills:** react, waterfall, promise-all

#### Learn

A request waterfall is what you get when you `await` one fetch before starting the next, even though the second fetch never needed the first one's result. Each `await` is a hard stop: the function suspends, the network round-trip completes, and only then does the next line run. Three independent 600ms calls done this way take about 1800ms. The network could have delivered all three in about 600ms if you had started them together. You paid triple for nothing.

The classic shape looks reasonable at a glance:

```js
async function loadDashboard(userId) {
  const user = await getUser(userId);       // 600ms
  const orders = await getOrders(userId);   // 600ms, waits for user to finish
  const tips = await getTips();             // 600ms, waits for orders to finish
  return { user, orders, tips };            // ~1800ms total
}
```

Read the data dependencies, not the line order. `getOrders(userId)` and `getTips()` do not use `user`. They only use `userId`, which you already had. Nothing forced them to wait. The `await` on line two is a serialization the code introduced by accident.

The fix is to start the independent work eagerly and await it together:

```js
async function loadDashboard(userId) {
  const [user, orders, tips] = await Promise.all([
    getUser(userId),
    getOrders(userId),
    getTips(),
  ]);
  return { user, orders, tips };            // ~600ms total
}
```

`Promise.all` does not make anything faster on its own. What makes it faster is that all three calls are *initiated* in the same tick, before any `await` suspends the function. `Promise.all` then waits for the slowest, and hands results back in input order regardless of finish order. Combined latency drops from the sum to the max.

There is a genuinely dependent case, and it is important to name it. If a call needs a value that only a prior call can produce, you cannot parallelize it. `const org = await getUser(id); const team = await getTeam(org.teamId);` is a real waterfall you are stuck with, because `teamId` does not exist until `getUser` resolves. The fix there is not `Promise.all` (you have nothing to run concurrently). It is either to collapse the two hops into one endpoint that returns the joined shape, or to hoist the parts that *are* independent so only the truly dependent leg waits.

React adds its own flavor of this. A parent component that fetches, renders, and only then mounts a child that also fetches creates an implicit waterfall across the component tree: the child's request cannot even start until the parent's finished and committed. Colocating fetches feels clean but serializes the tree. Lifting the fetch to a common parent (or a route loader) lets independent requests fire together.

**Interview nuance:** the tell that separates a mid from a senior answer is "await serializes; it does not parallelize." Anyone can say "use `Promise.all`." The signal is knowing *why* it helps (it lets initiation happen before suspension) and knowing when it does nothing (dependent chains, where the real fix is a combined endpoint).

Recap: independent `await`s run sequentially, so latency is the sum. Start independent work eagerly and await it with `Promise.all` to pay only the max. Only truly dependent calls must wait, and those want a combined endpoint, not a combinator.

#### See it live

**Demo (js-runnable):** runs three fake fetches (~600ms each) sequentially, then the same three under `Promise.all`, printing a wall-clock timer for each variant so you can watch 1800ms collapse to ~600ms.

```js
// Mock network: each fetch takes ~600ms, deterministic.
function fakeFetch(label, ms = 600) {
  return new Promise((res) => setTimeout(() => res(label), ms));
}

async function sequential() {
  const t0 = performance.now();
  const user = await fakeFetch("user");     // start, wait 600ms
  const orders = await fakeFetch("orders"); // then start, wait 600ms
  const tips = await fakeFetch("tips");     // then start, wait 600ms
  const ms = Math.round(performance.now() - t0);
  console.log(`A) sequential   -> [${user}, ${orders}, ${tips}] in ${ms}ms`);
  return ms;
}

async function concurrent() {
  const t0 = performance.now();
  const [user, orders, tips] = await Promise.all([
    fakeFetch("user"),   // all three
    fakeFetch("orders"), // start in the
    fakeFetch("tips"),   // same tick
  ]);
  const ms = Math.round(performance.now() - t0);
  console.log(`B) Promise.all  -> [${user}, ${orders}, ${tips}] in ${ms}ms`);
  return ms;
}

(async () => {
  const a = await sequential();
  const b = await concurrent();
  console.log(`\nSpeedup: ${(a / b).toFixed(1)}x (sum of 3 vs the slowest 1)`);

  // Scale it up: 20 independent calls.
  const many = Array.from({ length: 20 }, (_, i) => `r${i}`);
  const t0 = performance.now();
  await Promise.all(many.map((r) => fakeFetch(r)));
  console.log(`20 independent fetches via Promise.all: ${Math.round(performance.now() - t0)}ms (~600, not ~12000)`);
})();
```

**Watch:** variant A logs about 1800ms (three 600ms bars stacked end to end) and variant B logs about 600ms (three bars overlapping), for roughly a 3x speedup on the live ms counter. The 20-call line proves the point does not depend on the count: 20 independent requests still finish in about 600ms because they all start in one tick, while sequential would have taken about 12000ms.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Rewrite this loader so the three independent `await` fetches run concurrently and combined latency equals the slowest call, then point to the one fetch in it that genuinely cannot be parallelized and say why.

```js
async function loadProfile(userId) {
  const user = await getUser(userId);
  const posts = await getPosts(userId);
  const notifications = await getNotifications(userId);
  const team = await getTeam(user.teamId);
  return { user, posts, notifications, team };
}
```

**Think about:**
- Which of these fetches actually depend on each other?
- How does a parent-then-child fetch create an implicit waterfall?
- What does hoisting fetch initiation (start early, await late) do?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

`getUser`, `getPosts`, and `getNotifications` all take only `userId`, which you already have, so they are independent and were serialized by accident: four `await`s at 600ms each cost about 2400ms. `getTeam` is the exception. It needs `user.teamId`, which does not exist until `getUser` resolves, so that leg is a real dependency and must wait for the user.

The corrected shape runs the three independent calls together, then awaits the dependent one:

```js
async function loadProfile(userId) {
  const [user, posts, notifications] = await Promise.all([
    getUser(userId),
    getPosts(userId),
    getNotifications(userId),
  ]);
  const team = await getTeam(user.teamId); // must wait: needs user.teamId
  return { user, posts, notifications, team };
}
```

That is about 600ms for the parallel group plus about 600ms for the dependent team fetch, roughly 1200ms, down from 2400ms. If `getTeam`'s latency also matters, the real fix is server-side: a `getUserWithTeam` endpoint that returns the joined shape in one round-trip, collapsing the dependent hop entirely.

The mechanism is that `await` suspends the async function until the awaited promise settles, so line N+1 does not even *start* its request until line N's network round-trip is done. `Promise.all` changes nothing about waiting semantics; it changes *when initiation happens*. Because you call all three functions before the first `await` suspends, all three requests are in flight in the same tick, and `Promise.all` returns their results in input order once the slowest settles.

How to spot it in review: two or more consecutive `await fetch`/`await getX` lines where the later call's arguments do not reference the earlier call's result. In React specifically, watch for a child component that fetches on mount while its parent also fetched, which serializes across the tree because the child cannot mount until the parent committed.

Production symptom: pages that feel three to five times slower than the network justifies, with a devtools Network panel showing a descending staircase of requests that each start only when the previous one finished, instead of a cluster that all start together.

Common misconception: that `Promise.all` parallelizes any group of awaits. It only overlaps work that was independent to begin with. Wrapping a dependent chain in `Promise.all` either breaks (the value is not ready) or silently does nothing useful. The combinator overlaps; it cannot remove a real data dependency.

**Self-check rubric:**
- [ ] Identified the three independent fetches and grouped them in `Promise.all`.
- [ ] Correctly flagged `getTeam` as dependent (needs `user.teamId`) and kept it after the group.
- [ ] Explained the fix in terms of initiation-before-suspension, not just "use Promise.all."
- [ ] Named the sum-vs-max latency change with rough numbers.
- [ ] Mentioned the combined-endpoint fix for the dependent leg.
- [ ] Named a review tell and the production symptom.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Checkout page latency review. Predict the total latency of `loadCheckout` below and rewrite it to be as concurrent as the data dependencies allow, then explain why you cannot flatten it to a single `Promise.all`. Assume every call is ~500ms.

```js
async function loadCheckout(cartId) {
  const cart = await getCart(cartId);
  const items = await getItems(cart.itemIds);
  const shipping = await getShippingOptions(cart.address);
  const promos = await getPromos();
  const recommendations = await getRecommendations(items.map((i) => i.sku));
  return { cart, items, shipping, promos, recommendations };
}
```

**Model answer (revealed on demand):**

As written it is five sequential 500ms calls, about 2500ms. But the dependencies form two tiers, not one flat set, so a single `Promise.all` is impossible: `getItems` needs `cart.itemIds`, `getShippingOptions` needs `cart.address`, and `getRecommendations` needs `items` (the SKUs), which itself depends on the cart. Only `getPromos` is fully independent.

Rewrite it in dependency tiers, parallelizing within each tier:

```js
async function loadCheckout(cartId) {
  // Tier 0: independent + the root everything else needs.
  const [cart, promos] = await Promise.all([getCart(cartId), getPromos()]);

  // Tier 1: both need the cart, but not each other.
  const [items, shipping] = await Promise.all([
    getItems(cart.itemIds),
    getShippingOptions(cart.address),
  ]);

  // Tier 2: needs the item SKUs.
  const recommendations = await getRecommendations(items.map((i) => i.sku));

  return { cart, items, shipping, promos, recommendations };
}
```

That is three tiers of about 500ms each, roughly 1500ms, down from 2500ms, and `getPromos` rides for free inside tier 0 instead of adding its own 500ms. The mechanism is unchanged: within a tier the calls start in one tick and you pay only the slowest; across tiers you pay once per real dependency edge because the next tier's arguments literally do not exist until the previous tier resolved.

You cannot go below three tiers on the client because the dependency graph has depth three (cart -> items -> recommendations). The only way to beat 1500ms is to move the join to the server: a `getCheckout(cartId)` endpoint that resolves the whole graph in one round-trip. That is the senior instinct: a client waterfall of depth N is often a signal that the API should expose a coarser, purpose-built endpoint so the depth collapses to one.

### ajr-l7-n-plus-1-list: N+1 fetch-per-item in a list

- **id:** `ajr-l7-n-plus-1-list`  ·  **difficulty:** medium  ·  **est:** 14 min  ·  **demo:** react-demo  ·  **skills:** react, n-plus-1, batching

#### Learn

N+1 is the list version of a waterfall. You do one request to load the list of ids (the "1"), then render a row per id, and each row fetches its own detail on mount (the "N"). Fifty rows means fifty-one requests. The name comes from ORMs, but React reproduces it perfectly, because every mounted child runs its own `useEffect`, and effects do not coordinate with each other.

The shape is almost always this:

```tsx
function List({ ids }: { ids: string[] }) {
  return <>{ids.map((id) => <Row key={id} id={id} />)}</>;
}

function Row({ id }: { id: string }) {
  const [item, setItem] = useState<Item | null>(null);
  useEffect(() => {
    fetch(`/api/items/${id}`).then((r) => r.json()).then(setItem);
  }, [id]);
  return <li>{item ? item.name : "loading..."}</li>;
}
```

Each `Row` is self-contained and looks tidy, which is exactly why this passes review. The problem is emergent: nothing above the rows knows there are twenty-five of them, so nothing batches. Twenty-five effects fire twenty-five fetches. It gets worse because of a browser limit most people forget: HTTP/1.1 caps concurrent connections per origin at about six. So the twenty-five requests do not even all run at once. Six go, nineteen queue, and they drain in waves, each wave gated by the slowest request in the previous one. Your list renders in stripes.

The fix is to fetch the whole list in one request and pass data down, so rows render, not fetch:

```tsx
function List({ ids }: { ids: string[] }) {
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => {
    fetch(`/api/items?ids=${ids.join(",")}`)   // ONE request for all ids
      .then((r) => r.json())
      .then(setItems);
  }, [ids]);
  return <>{items.map((item) => <Row key={item.id} item={item} />)}</>;
}

function Row({ item }: { item: Item }) {
  return <li>{item.name}</li>; // pure render, no fetch
}
```

One round-trip, one response, the six-connection cap never engages. The mechanism you are removing is per-child effect autonomy: by lifting the fetch to the parent you give the requests a single coordinator that knows all the ids at once.

**Interview nuance:** the trap answer is "add a cache to dedupe the requests." A shared request cache (React Query, SWR, a DataLoader) is real and useful, but dedup only merges *identical* keys. In a list of twenty-five distinct ids there are no duplicates to merge, so a cache leaves you with twenty-five distinct cache misses and twenty-five requests. Dedup fixes the same-key-twice problem; it does not fix N-distinct-keys. What fixes N+1 is *batching*: collapsing N distinct keys into one request. A DataLoader helps here specifically because it batches distinct keys within a tick, not because it caches.

Recap: a fetch inside a list item produces N+1 round-trips, throttled into waves by the six-connection cap. Lift the fetch to the parent and hit a batched endpoint (`ids=...`, GraphQL, or a DataLoader) so N distinct keys become one request. A cache alone does not save you when the keys are all distinct.

#### See it live

**Demo (react-demo):** a widget renders a list of 25 rows and a mock "Network" panel of request bars. A toggle switches between "Naive (fetch per row)" and "Batched (one request)." A request counter shows **25** in naive mode and **1** in batched mode, and the naive bars queue in stripes to model the ~6-connection browser cap while the batched mode shows a single fat bar.

The widget is built around this contrast (mock timers stand in for the network so it is deterministic):

```tsx
function NPlusOneDemo() {
  const [mode, setMode] = useState<"naive" | "batched">("naive");
  const ids = useMemo(() => Array.from({ length: 25 }, (_, i) => `i${i}`), []);
  const [requestCount, setRequestCount] = useState(0);

  // Naive: each Row owns its fetch.
  function NaiveRow({ id }: { id: string }) {
    const [ready, setReady] = useState(false);
    useEffect(() => {
      setRequestCount((c) => c + 1);          // one request per row -> 25
      const t = setTimeout(() => setReady(true), 400);
      return () => clearTimeout(t);
    }, [id]);
    return <li>{ready ? id : "loading..."}</li>;
  }

  // Batched: parent fetches once, rows just render.
  const [items, setItems] = useState<string[]>([]);
  useEffect(() => {
    if (mode !== "batched") return;
    setRequestCount((c) => c + 1);            // one request total -> 1
    const t = setTimeout(() => setItems(ids), 400);
    return () => clearTimeout(t);
  }, [mode, ids]);

  return (
    <div>
      <button onClick={() => { setRequestCount(0); setItems([]); setMode(mode === "naive" ? "batched" : "naive"); }}>
        Mode: {mode}
      </button>
      <p>Requests fired: {requestCount}</p>
      <ul>
        {mode === "naive"
          ? ids.map((id) => <NaiveRow key={id} id={id} />)
          : items.map((id) => <li key={id}>{id}</li>)}
      </ul>
    </div>
  );
}
```

**Watch:** flip the toggle and read the "Requests fired" counter: naive mode climbs to 25 and its request bars queue in striped waves of about six at a time (the modelled per-origin connection cap), so the list fills in visibly staggered bands. Batched mode shows the counter at 1 and a single request bar, and the whole list appears together. This is an illustration of the browser six-connection behavior using mock timers, not a real socket panel, but the counter (25 vs 1) is the exact thing that changes in a real Network tab.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Turn this list, where every `Row` fetches itself, into one batched request for the whole list, and explain why a shared request cache would not have fixed it.

```tsx
function UserList({ userIds }: { userIds: string[] }) {
  return (
    <ul>
      {userIds.map((id) => <UserRow key={id} id={id} />)}
    </ul>
  );
}

function UserRow({ id }: { id: string }) {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    fetch(`/api/users/${id}`).then((r) => r.json()).then(setUser);
  }, [id]);
  return <li>{user ? user.name : "…"}</li>;
}
```

**Think about:**
- Why does each row fetch independently?
- What is the browser per-origin connection cap?
- Does dedup fix N distinct keys?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

Each `UserRow` runs its own `useEffect` on mount, and effects have no shared coordinator, so a list of fifty ids fires fifty-one requests (one for the id list upstream, fifty for the rows). Lift the fetch to the parent and call a batch endpoint:

```tsx
function UserList({ userIds }: { userIds: string[] }) {
  const [users, setUsers] = useState<User[]>([]);
  useEffect(() => {
    let active = true;
    fetch(`/api/users?ids=${userIds.join(",")}`)   // one request for all ids
      .then((r) => r.json())
      .then((data) => { if (active) setUsers(data); });
    return () => { active = false; };
  }, [userIds]);
  return (
    <ul>
      {users.map((user) => <UserRow key={user.id} user={user} />)}
    </ul>
  );
}

function UserRow({ user }: { user: User }) {
  return <li>{user.name}</li>; // renders, does not fetch
}
```

If you cannot change the backend, a `DataLoader` gives the same result client-side: each row can still "ask" for its id, but the loader collects all the ids requested within a tick and issues one batched call, then routes each result back to its row. The point either way is that N distinct keys become one round-trip.

Mechanism: React commits the parent, mounts every child, and runs every child's effect. There is no batching primitive built into effect scheduling, so N children means N independent network calls. The browser then throttles them because HTTP/1.1 allows only about six concurrent connections per origin, so the calls drain in serialized waves and the list paints in stripes. Moving the fetch to the parent removes the autonomy: one component holds all the ids and makes one call.

How to spot it in review: a data hook or `fetch` inside a component that is rendered by `.map(...)` and keyed by a row id. Any "fetch scoped to a single row" is the smell.

Production symptom: fifty rows fire fifty requests, the API gets hammered (and may start returning 429s), and the page stalls because later rows are stuck behind the connection cap waiting for earlier ones to finish.

Misconception to correct: "a shared cache fixes it." Deduping caches (SWR, React Query, DataLoader's cache) only merge *identical* keys. Fifty distinct user ids have zero duplicates, so you still get fifty cache misses and fifty requests. Dedup solves "the same key requested twice," not "fifty different keys." Batching, collapsing distinct keys into one request, is the fix.

**Self-check rubric:**
- [ ] Moved the fetch out of the row and into the parent (or introduced a batching DataLoader).
- [ ] Hit a single batched endpoint (`ids=...`) instead of one per row.
- [ ] Explained N+1 as per-child effect autonomy with no coordinator.
- [ ] Named the ~6 per-origin connection cap and the striped/waved draining it causes.
- [ ] Correctly explained why dedup does not fix N distinct keys.
- [ ] Named the production symptom (request storm, possible 429s, stalled page).

#### Practice: real-world variant (save, then reveal)

**Prompt:** Feed with nested N+1. In an activity feed, `Feed` fetches 30 posts in one call (good), but each `PostCard` then fetches its author by `authorId`, and authors repeat heavily (30 posts, only 8 distinct authors). Predict the request count, then propose the best fix and say precisely where a dedup cache helps here versus where batching is still needed.

```tsx
function Feed() {
  const { data: posts } = useQuery(["posts"], fetchPosts); // 1 request, 30 posts
  return <>{posts?.map((p) => <PostCard key={p.id} post={p} />)}</>;
}

function PostCard({ post }: { post: Post }) {
  const { data: author } = useQuery(["author", post.authorId], () =>
    fetch(`/api/authors/${post.authorId}`).then((r) => r.json())
  );
  return <article>{author?.name}: {post.title}</article>;
}
```

**Model answer (revealed on demand):**

This is the interesting case, because dedup and batching each fix a *different part* of it. Naively there are 1 (posts) + 30 (one author fetch per card) = 31 requests. But note this feed has heavy key repetition: 30 posts, only 8 distinct `authorId`s. So here a dedup cache is not useless. Because `useQuery` keys authors by `["author", post.authorId]`, React Query collapses the 30 requests to 8 (one per distinct author, the rest served from cache). That takes you from 31 to 9 requests for free, purely from same-key dedup.

But 9 is still N+1 in miniature: you are doing a waterfall (posts first, then authors) plus one request per distinct author. To get to 2, you need batching on top of dedup. Two good options:

```tsx
// Option A: batch the distinct authors in the parent after posts load.
function Feed() {
  const { data: posts } = useQuery(["posts"], fetchPosts);
  const authorIds = useMemo(
    () => [...new Set(posts?.map((p) => p.authorId) ?? [])],
    [posts]
  );
  const { data: authors } = useQuery(
    ["authors", authorIds],
    () => fetch(`/api/authors?ids=${authorIds.join(",")}`).then((r) => r.json()),
    { enabled: authorIds.length > 0 }
  );
  const byId = useMemo(
    () => new Map((authors ?? []).map((a) => [a.id, a])),
    [authors]
  );
  return <>{posts?.map((p) => <PostCard key={p.id} post={p} author={byId.get(p.authorId)} />)}</>;
}
```

Option B is a `DataLoader`: keep the per-card ask, but the loader batches the distinct `authorId`s requested within a tick into one `/api/authors?ids=...` call and dedupes repeats at the same time. That is the cleanest because it keeps colocated data requests in the cards while still producing one round-trip.

The best-of-all fix is server-side: have `fetchPosts` return each post with its author embedded, so authors ride along in the single posts request and the count is 1. Prefer that when you own the endpoint.

The precise line to draw for the interview: **dedup collapses repeated keys (30 author fetches to 8), batching collapses distinct keys into one request (8 to 1), and embedding on the server collapses the tier entirely (to 0 extra requests).** Reaching only for a cache stops at 9 and calls it solved, which is the mid-level miss.

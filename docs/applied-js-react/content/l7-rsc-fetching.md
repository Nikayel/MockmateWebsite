> Module **7.6** (RSC Fetching) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [7.5](./l7-suspense-use.md) · Next: [8.1](./l8-diagnosing-renders.md)

# L7 · RSC Fetching

React Server Components move fetching to the server, but they do not delete waterfalls: nested `await`s serialize into a server-side staircase the browser network tab never shows, and shipping fat payloads or missing fields just moves the cost to render time and follow-up calls. After this module you can catch a serialized RSC render, deduplicate identical loads with `preload()` plus `cache()`, and tell over-fetching from under-fetching on sight.

### ajr-l7-rsc-server-waterfall: RSC server waterfalls, memoization, and preload

- **id:** `ajr-l7-rsc-server-waterfall`  ·  **difficulty:** hard  ·  **est:** 16 min  ·  **demo:** js-runnable  ·  **skills:** rsc, waterfall, cache

#### Learn

The pitch for React Server Components is that data fetching moves next to the render, so `await` in a component is fine. It is fine, until it is a waterfall you cannot see. An async server component blocks its entire subtree until its own `await` settles. If a child is also an async component that awaits, that second fetch cannot even start until the parent's await resolves and React gets far enough to render the child. Nested awaits serialize.

Here is the trap:

```tsx
// app/dashboard/page.tsx  (Server Component)
async function Page() {
  const user = await getUser();          // round-trip 1
  return <Profile user={user} />;
}

async function Profile({ user }) {
  const posts = await getPosts(user.id); // round-trip 2, starts only after 1 settles
  const stats = await getStats(user.id); // round-trip 3, starts only after 2 settles
  return <>...</>;
}
```

Three DB round-trips run back to back. If each is 100ms, the render blocks for 300ms. Nothing shows in the browser network tab, because these are server-to-DB calls, not browser-to-server. The page just feels slow to first byte and you have no obvious culprit.

Two mechanisms fix this. First, **hoist and fire early**. A `preload()` helper starts the fetch high in the tree without awaiting it there, so the request is already in flight by the time the component that needs the data awaits it:

```tsx
export const preloadPosts = (id) => { void getPosts(id); };  // fire, do not await
```

Second, **deduplicate**. React's `cache()` memoizes a function per server request: call `getStats(id)` from three components in one render and only one call actually runs, the rest get the cached promise. Native `fetch()` is already request-memoized by React, but a raw database client is not, so you wrap it:

```tsx
import { cache } from 'react';
export const getStats = cache(async (id) => db.stats.find(id));
```

Now `preloadPosts(user.id)` fired at the top means round-trips 2 and 3 overlap with each other and with rendering, and `cache()` collapses duplicate `getStats` calls from 4 to 1.

**Interview nuance:** the single most common wrong answer here is "RSC has no waterfalls, that is the whole point." RSC removes *client-server* waterfalls (the browser no longer fetches, renders, discovers it needs more, and fetches again). It does nothing about *server-side* serialization from nested awaits. Saying you know the difference is the tell.

**Interview nuance:** `fetch` dedup is automatic per request, `cache()` is opt-in for everything else. People assume their ORM calls dedupe like `fetch` does. They do not.

Recap: async server components block their subtree on `await`, so nested awaits serialize into an invisible server waterfall. Hoist `preload()` to start work early, and wrap non-`fetch` data access in `cache()` so identical calls in one request dedupe.

#### See it live

**Demo (js-runnable):** a mock server render, three async data loads awaited sequentially, then the same three hoisted and run together with `Promise.all`, timing each pass, plus a dedup counter.

```js
// Mock three DB round-trips. Each takes ~100ms.
let dbQueries = 0;
function slowLoad(label, ms = 100) {
  dbQueries++;
  return new Promise((res) => setTimeout(() => res(label), ms));
}

// A memoize-per-render helper, the shape of React's cache().
function cache(fn) {
  const seen = new Map();
  return (key) => {
    if (seen.has(key)) return seen.get(key);   // identical call -> reuse promise
    const p = fn(key);
    seen.set(key, p);
    return p;
  };
}

async function sequential() {
  dbQueries = 0;
  const t0 = performance.now();
  const user = await slowLoad('user');         // round-trip 1
  const posts = await slowLoad('posts');        // starts after 1
  const stats = await slowLoad('stats');        // starts after 2
  const stats2 = await slowLoad('stats');       // a 4th, duplicate load
  const ms = (performance.now() - t0).toFixed(0);
  console.log(`A) sequential (nested awaits): ${ms}ms, DB queries: ${dbQueries}`);
}

async function parallelDeduped() {
  dbQueries = 0;
  const t0 = performance.now();
  const getStats = cache((k) => slowLoad(k));   // dedupe identical loads
  // hoist + fire early, then await together
  const [user, posts, stats, stats2] = await Promise.all([
    slowLoad('user'),
    slowLoad('posts'),
    getStats('stats'),
    getStats('stats'),                          // same key -> no new query
  ]);
  const ms = (performance.now() - t0).toFixed(0);
  console.log(`B) Promise.all + cache(): ${ms}ms, DB queries: ${dbQueries}`);
}

(async () => {
  await sequential();       // ~400ms, DB queries: 4
  await parallelDeduped();  // ~100ms, DB queries: 3
})();
```

**Watch:** pass A logs about 400ms with `DB queries: 4`, a stacked staircase of four back-to-back loads. Pass B logs about 100ms with `DB queries: 3`: the loads overlap into three concurrent bars and the duplicate `stats` call collapses via `cache()` so the badge reads 3 instead of 4. This is a faithful model of the serialization and dedup behavior. It is not a real React render (there is no Suspense boundary or component tree here), just the timing and dedup mechanics `await` sequencing and `cache()` produce.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Convert a parent server component that awaits then renders an awaiting child into a hoisted `preload()` plus a React `cache()`-wrapped access so identical calls dedupe. Rewrite the code below and say exactly which round-trips stop serializing and why the DB query count drops.

```tsx
async function Page() {
  const user = await getUser();
  return <Profile user={user} />;
}
async function Profile({ user }) {
  const posts = await getPosts(user.id);   // getPosts is a raw db call, not fetch
  const stats = await getStats(user.id);
  return <Sidebar user={user} />;          // Sidebar also calls getStats(user.id)
}
```

**Think about:**
- Why do nested awaits serialize on the server?
- What does React `cache()` dedupe?
- What does preload (fire early, await late) do?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The corrected version wraps the data access in `cache()` and hoists a `preload` call so the child's fetches are already in flight before the child renders:

```tsx
import { cache } from 'react';

export const getPosts = cache((id) => db.posts.byUser(id));   // memoized per request
export const getStats = cache((id) => db.stats.byUser(id));
export const preload = (id) => { void getPosts(id); void getStats(id); }; // fire, no await

async function Page() {
  const user = await getUser();
  preload(user.id);                 // start posts + stats now, do not await here
  return <Profile user={user} />;
}
async function Profile({ user }) {
  const posts = await getPosts(user.id);   // already in flight -> resolves fast
  const stats = await getStats(user.id);
  return <Sidebar user={user} />;          // getStats(user.id) hits the cache, 0 new queries
}
```

**Why, at the mechanism level:** an async server component suspends its whole subtree until its `await` settles, and React does not descend into `Profile` until `Page`'s await resolves. So originally `getPosts` cannot start until `getUser` finishes, and `getStats` cannot start until `getPosts` finishes: three serialized round-trips. `preload(user.id)` starts `getPosts` and `getStats` concurrently the moment `user` is known, so by the time `Profile` awaits them the work is done. `cache()` memoizes each function per server request, so `Sidebar` calling `getStats(user.id)` returns the same in-flight promise instead of a fourth DB round-trip.

**How to spot it in review:** nested `await` in server components with no `preload`, and direct DB or ORM calls that are not wrapped in `cache()`. A `fetch` is request-memoized for free, a `db.query` is not, so duplicate `db.stats.byUser(id)` calls from two components each hit the database.

**Production symptom:** slow server render and high time-to-first-byte with serialized DB round-trips that are invisible in the browser network tab. You see it only in server traces or DB query logs, where one page load fires the same query several times in sequence.

**Common misconception:** "RSC has no waterfalls." RSC removes the client-server round-trip loop, not server-side serialization. Nested awaits still stack, and identical loads still duplicate unless you dedupe them.

**Self-check rubric:**
- [ ] I wrapped both DB accessors in `cache()`, not just one.
- [ ] I hoisted a `preload()` that fires without awaiting.
- [ ] I explained that `Profile` does not render until `Page`'s await settles.
- [ ] I named which round-trips stop serializing (posts and stats overlap).
- [ ] I explained the query count drop as `cache()` dedup, not parallelism.
- [ ] I said the waterfall is invisible in the browser network tab.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Fix the "product page renders in 900ms" incident. A Next.js product page has `Page` awaiting `getProduct(slug)`, then a `<Reviews>` child awaiting `getReviews(id)`, a `<Recommendations>` child awaiting `getRecs(id)`, and a `<PriceBadge>` deep in the tree that also awaits `getProduct(slug)` a second time. All four are raw Prisma calls at ~200ms each. Rewrite the fetching layer so the page renders in roughly 400ms and say what the trace looks like before and after.

**Model answer (revealed on demand):**

Before: `getProduct` (200ms) blocks the subtree, then `getReviews` (200ms) and `getRecs` (200ms) serialize because each child awaits after the parent resolves, and `PriceBadge` fires a second `getProduct` (200ms). Roughly 800 to 900ms, four sequential Prisma round-trips.

```tsx
import { cache } from 'react';

export const getProduct = cache((slug) => prisma.product.findUnique({ where: { slug } }));
export const getReviews = cache((id) => prisma.review.findMany({ where: { productId: id } }));
export const getRecs    = cache((id) => prisma.rec.forProduct(id));

export function preloadProduct(slug, id) {
  void getProduct(slug);
  void getReviews(id);
  void getRecs(id);
}

async function Page({ params }) {
  const product = await getProduct(params.slug);   // round-trip 1, ~200ms
  preloadProduct(params.slug, product.id);         // fire reviews + recs now
  return (
    <>
      <PriceBadge slug={params.slug} />            {/* getProduct hits cache, 0 queries */}
      <Reviews id={product.id} />                  {/* already in flight */}
      <Recommendations id={product.id} />          {/* already in flight */}
    </>
  );
}
```

**Why:** after the first `getProduct` resolves and gives you `product.id`, `preloadProduct` starts reviews and recs concurrently, so they overlap instead of stacking. That collapses three of the four round-trips into one 200ms window, giving roughly 400ms total. `cache()` makes `PriceBadge`'s `getProduct(slug)` return the memoized promise from the first call, so the duplicate Prisma query disappears entirely.

**How to spot it in review:** grep for `await getX` inside child server components with no matching `preload`, and any accessor called from more than one component that is not wrapped in `cache()`. In an APM trace the before-picture is a diagonal staircase of same-request DB spans, the after-picture is a short first span followed by an overlapped cluster.

**Production symptom:** high TTFB and a slow-to-stream page under load, worst on cold caches, with DB dashboards showing duplicate identical queries per page view. The browser network tab shows one slow document request and hides the real cause.

### ajr-l7-over-under-fetching: Over-fetching and under-fetching

- **id:** `ajr-l7-over-under-fetching`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** js-runnable  ·  **skills:** react, fetching, performance

#### Learn

Two opposite fetching sins cost you in opposite ways. **Over-fetching** asks for more than the view renders: a component shows a name and an avatar but the endpoint returns a 40-field user object with bio, preferences, audit timestamps, and a nested settings blob. **Under-fetching** asks for too little: a list endpoint returns post rows with an `authorId` but not the author name, so the UI fires a follow-up request per row to fill in the label.

Over-fetching hurts twice. First on the wire: a 30KB response instead of 1KB, which on a slow mobile connection is real latency. Second, and less obvious, on the main thread: `JSON.parse` on a fat payload is synchronous work that blocks rendering, and the bigger the payload the longer the parse. You pay to transfer and parse fields you throw away.

Under-fetching creates a waterfall. The list resolves, renders, and only then does each row discover it needs an author name, firing N follow-up fetches. That is a classic N+1: one query for the list, N for the details. The page paints, then flickers in labels one round-trip later.

```js
// Over-fetch: 40 fields, render uses 2.
const user = await fetch(`/api/users/${id}`).then(r => r.json()); // 30KB
return <Card name={user.name} avatar={user.avatarUrl} />;         // 38 fields wasted

// Under-fetch: list lacks author names, each row fetches its own.
const posts = await fetch('/api/posts').then(r => r.json());      // no author.name
posts.map(p => fetch(`/api/users/${p.authorId}`));                // N+1 follow-ups
```

The fix for both is **field selection**: let the client declare exactly which fields it needs. GraphQL does it in the query, a REST sparse fieldset does it with `?fields=name,avatarUrl`, and a React Query `select` transform does it after the fetch to at least shrink what gets cached and re-rendered:

```ts
useQuery({
  queryKey: ['user', id],
  queryFn: () => fetch(`/api/users/${id}`).then(r => r.json()),
  select: (u) => ({ name: u.name, avatar: u.avatarUrl }), // keep 2 of 40
});
```

For under-fetching, the fix is to include the join up front: `GET /api/posts?include=author.name` or a GraphQL query that selects `author { name }`, so one response carries everything the list renders.

**Interview nuance:** a `select` transform does not shrink the network payload, the full 40 fields still cross the wire and get parsed. It shrinks what React Query stores and what your component re-renders on, which cuts re-render cost and memory but not bandwidth. Real payload reduction needs the *server* to project the fields (GraphQL, sparse fieldset, a projected DB query).

**Interview nuance:** the seductive wrong instinct is "one generic endpoint everywhere is DRY." A generic `/api/users/:id` that returns everything is reusable, but every caller over-fetches, and a mobile list of 50 users pays 50x for fields it never shows. Reuse is not free when the shared thing is oversized.

Recap: over-fetching burns bandwidth and parse time on unused fields, under-fetching triggers N+1 follow-up waterfalls. Select exactly the fields the view renders, and prefer server-side projection when the payload itself is the cost.

#### See it live

**Demo (js-runnable):** fetch a fat 40-field JSON versus a projected one, timing parse cost, then a list missing author names that triggers follow-up calls.

```js
// Mock a network fetch with size-proportional transfer + parse time.
function mockFetch(bytes, label) {
  const transferMs = bytes / 300;          // slower for bigger payloads
  return new Promise((res) => setTimeout(() => {
    const t0 = performance.now();
    // simulate JSON.parse cost scaling with size
    let sink = 0; for (let i = 0; i < bytes * 20; i++) sink += i % 7;
    const parseMs = (performance.now() - t0);
    res({ label, bytes, transferMs, parseMs });
  }, transferMs));
}

async function overVsProjected() {
  const fat = await mockFetch(30000, 'fat 40-field');       // ~30KB
  console.log(`A) over-fetch: ${fat.bytes/1000}KB, parse ${fat.parseMs.toFixed(1)}ms`);
  const lean = await mockFetch(1000, 'projected name+avatar'); // ~1KB
  console.log(`B) projected: ${lean.bytes/1000}KB, parse ${lean.parseMs.toFixed(1)}ms`);
}

async function underFetch() {
  const t0 = performance.now();
  const posts = await mockFetch(2000, 'list (no author names)'); // 1 list call
  console.log(`list resolved at ${(performance.now()-t0).toFixed(0)}ms, now N follow-ups...`);
  const authorIds = [1, 2, 3, 4, 5];
  // each row fetches its own author name: N+1 waterfall
  for (const id of authorIds) {
    await mockFetch(500, `author ${id}`);
    console.log(`  author ${id} filled at ${(performance.now()-t0).toFixed(0)}ms`);
  }
  console.log(`under-fetch total: ${(performance.now()-t0).toFixed(0)}ms (1 + ${authorIds.length} calls)`);
}

(async () => { await overVsProjected(); await underFetch(); })();
```

**Watch:** pass A logs a 30KB payload with a visibly larger parse time, pass B logs a 1KB payload that parses almost instantly, the two payload-size bars sit at 30KB versus 1KB with parse counters beside them. The under-fetch pass logs the list resolving, then five author names filling in one after another with climbing timestamps, a staircase of N+1 follow-ups after the list already painted. The byte sizes and call counts are exact, the parse and transfer times are a proportional model of real transfer and `JSON.parse` cost, not measured browser I/O.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Introduce field selection so a name+avatar view fetches only what it renders, shrinking the payload. Given the component below that destructures 2 fields off a 40-field response and a list that fires a follow-up per row for author names, add projection and a joined fetch, and say which change cuts bytes versus which cuts round-trips.

```tsx
function UserChip({ id }) {
  const { data: u } = useQuery({
    queryKey: ['user', id],
    queryFn: () => fetch(`/api/users/${id}`).then(r => r.json()), // 40 fields, 30KB
  });
  return <Chip name={u.name} avatar={u.avatarUrl} />;
}

function PostList() {
  const { data: posts } = useQuery({ queryKey: ['posts'], queryFn: fetchPosts });
  // each row fetches its own author name -> N+1
  return posts.map(p => <Row key={p.id} post={p} author={<UserChip id={p.authorId} />} />);
}
```

**Think about:**
- What does over-fetching cost on mobile?
- What does under-fetching cause?
- What is the reuse tradeoff of a generic endpoint?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

Project the fields the view actually renders, and join the author into the list so there is no per-row follow-up:

```tsx
function UserChip({ id }) {
  const { data: u } = useQuery({
    queryKey: ['user', id],
    // server-side projection: only the 2 fields cross the wire (~1KB)
    queryFn: () => fetch(`/api/users/${id}?fields=name,avatarUrl`).then(r => r.json()),
  });
  return <Chip name={u.name} avatar={u.avatarUrl} />;
}

function PostList() {
  const { data: posts } = useQuery({
    queryKey: ['posts'],
    // include the author name in the list response -> no N+1
    queryFn: () => fetch('/api/posts?include=author.name').then(r => r.json()),
  });
  return posts.map(p => (
    <Row key={p.id} post={p} author={<Chip name={p.author.name} avatar={p.author.avatarUrl} />} />
  ));
}
```

**Why, at the mechanism level:** the sparse fieldset `?fields=name,avatarUrl` makes the *server* project the response, so the 38 unused fields never transfer and never get parsed. That is the change that cuts bytes and main-thread parse time. The `?include=author.name` change puts the join in one response, so the list no longer resolves, renders, and *then* discovers it needs author names: it eliminates the N follow-up round-trips. That is the change that cuts round-trips. If you cannot touch the server, a React Query `select: (u) => ({ name: u.name, avatar: u.avatarUrl })` shrinks the cached and re-rendered object but the full payload still crosses the wire, so it helps re-render cost, not bandwidth.

**How to spot it in review:** a component destructuring 2 or 3 fields off a fat response object, or a list row rendering a child that fires its own fetch for a single label. The second is the N+1 tell: a fetch inside a `.map`.

**Production symptom:** heavy, slow responses that hurt most on mobile and low-end devices (bandwidth plus parse), or a chatty request log with one list call followed by a burst of tiny detail calls that make the page flicker labels in after paint.

**Common misconception:** "reusing one generic endpoint everywhere is free." A single `/api/users/:id` that returns all 40 fields is convenient, but every caller over-fetches, and a screen rendering 50 chips pays 50x for fields it never displays. Shared does not mean cheap when the shared payload is oversized.

**Self-check rubric:**
- [ ] I added server-side projection (sparse fieldset / GraphQL) for the chip.
- [ ] I moved the author name into the list response to kill the N+1.
- [ ] I said projection cuts bytes and the join cuts round-trips.
- [ ] I noted a `select` transform shrinks re-renders but not the wire payload.
- [ ] I named the production symptom (heavy mobile responses or chatty N+1 log).
- [ ] I addressed the generic-endpoint reuse tradeoff.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Cut the "feed screen is janky on 3G" report. A mobile feed renders 50 cards, each showing an author name and avatar. The feed endpoint returns full post objects (each ~5KB, with body HTML, edit history, and a 30-field embedded author), and any card missing author data falls back to a per-card `GET /api/users/:id`. Redesign the fetching so the initial payload is small and there are no per-card follow-ups, and quantify the before and after.

**Model answer (revealed on demand):**

Before: 50 cards x ~5KB is roughly 250KB transferred and parsed, most of it body HTML and edit history the feed never shows, plus any fallback fires up to 50 extra `GET /api/users/:id` calls. On 3G that is seconds of transfer and a long main-thread parse block, plus an N+1 storm.

```ts
// Feed query: project only feed-card fields, join author name+avatar once.
useQuery({
  queryKey: ['feed'],
  queryFn: () => fetch(
    '/api/feed?fields=id,title,createdAt&include=author.name,author.avatarUrl'
  ).then(r => r.json()),   // ~1KB total instead of ~250KB
});
```

**Why:** server-side projection drops body HTML and edit history so the payload shrinks from ~250KB to ~1KB, which cuts both 3G transfer time and the synchronous `JSON.parse` that was blocking the main thread and causing the jank. Bundling `author.name` and `author.avatarUrl` into the same feed response removes the per-card fallback entirely, so there is no N+1: one request carries everything 50 cards render. If the backend is GraphQL, the equivalent is selecting exactly `{ id title createdAt author { name avatarUrl } }`.

**How to spot it in review:** a list endpoint returning full domain objects to a summary view, and a card component with a fetch fallback keyed by an id. In a network trace the before-picture is one huge document plus a burst of tiny user calls, the after-picture is a single small response.

**Production symptom:** slow, janky scroll and long input delay on low-end and 3G devices, high data usage complaints, and a request log dominated by one fat feed call and dozens of tiny author calls. The fix is measured directly as payload KB and follow-up call count dropping toward one request.

> Module **7.5** (Suspense & use()) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [7.4](./l7-mutations-optimistic.md) · Next: [7.6](./l7-rsc-fetching.md)

# L7 · Suspense & use()

React 19 turns promises into first-class render inputs through `use()` and `<Suspense>`, but both have sharp edges that produce the two most common production incidents in this area: a component that suspends forever because it never sees the same promise twice, and a page that either blanks entirely or crashes completely because one boundary was asked to guard too much. After this module you will be able to catch a promise being created inside a client render, and to read a Suspense/ErrorBoundary tree and predict exactly what the user sees while things load and when one thing fails.

### ajr-l7-use-stable-promise: use() requires a cached/stable promise

- **id:** `ajr-l7-use-stable-promise`  ·  **difficulty:** hard  ·  **est:** 14 min  ·  **demo:** react-demo  ·  **skills:** react19, suspense, use

#### Learn

`use()` is the React 19 hook that unwraps a promise (or a Context) during render. When you call `use(promise)`, React reads the promise. If it is still pending, `use()` throws the promise to the nearest `<Suspense>` boundary, which shows its fallback. When the promise settles, React re-renders the component, calls `use(promise)` again, sees the same promise is now fulfilled, and returns its resolved value. That last sentence hides the trap: the whole mechanism depends on React seeing the *same promise object* across renders.

Here is the bug in its natural habitat:

```tsx
function Profile({ id }: { id: string }) {
  const user = use(fetchUser(id)); // fresh promise every render
  return <h1>{user.name}</h1>;
}
```

`fetchUser(id)` runs on every render and returns a brand new promise each time. First render: the promise is pending, `use()` suspends, Suspense shows the fallback. The promise eventually resolves, React re-renders to try again, and `fetchUser(id)` produces a *different* promise that is once again pending. `use()` suspends again. React resolves it, re-renders, gets yet another new promise, and so on. The component never commits. You get an infinite spinner and, worse, a new network request on every cycle, so you are also hammering your API.

The fix is to make the promise identity stable so that the re-render after resolution sees the fulfilled promise, not a new pending one. The promise must be created *outside* the render that consumes it: in a cache keyed by `id`, in a parent that passes it down as a prop, or in a Server Component that streams it in.

```tsx
const userCache = new Map<string, Promise<User>>();
function getUser(id: string) {
  if (!userCache.has(id)) userCache.set(id, fetchUser(id));
  return userCache.get(id)!;
}

function Profile({ id }: { id: string }) {
  const user = use(getUser(id)); // same promise per id across renders
  return <h1>{user.name}</h1>;
}
```

Now the first render creates and caches the promise, `use()` suspends once, and the re-render after settling looks up the *identical* fulfilled promise and returns immediately. Network counter: 1.

**Interview nuance:** `use()` does not create or memoize the promise for you, unlike a data library such as React Query where you pass a key and a fetcher. `use()` is a lower-level primitive: it consumes a promise someone else is responsible for caching. Also note `use()` is allowed to be called conditionally and inside loops (it is not bound by the rules of hooks the way `useState` is), which is why people reach for it, but that flexibility does not exempt you from stable identity.

**Interview nuance:** You cannot wrap `use()` in a `try/catch` to handle a pending state, because a pending promise is thrown as a control-flow signal to Suspense, not as an error. A `catch` would swallow the suspend. Rejections are a different story: those surface to the nearest ErrorBoundary (see the next lesson).

Recap: `use()` suspends until a promise settles and returns the value on the re-render; a new promise object each render restarts that cycle forever, so create the promise in a cache, parent, or Server Component and pass the *stable* promise into `use()`.

#### See it live

**Demo (react-demo):** A `Profile` widget renders twice side by side, one calling `use(fetchUser(id))` inline and one calling `use(getUser(id))` from a cache, each with a render-count badge and a network-request counter.

The widget shows two cards labeled "Inline promise" and "Cached promise". Each card contains a mounted `Profile`, a badge reading `renders: N`, and a badge reading `requests: N`. A shared mock `fetchUser` resolves after 600ms and increments a request counter every time it is invoked. The learner clicks "Mount both" to start and watches the two counters diverge.

```tsx
let requestCount = 0;
function fetchUser(id: string): Promise<{ name: string }> {
  requestCount++;
  return new Promise((resolve) =>
    setTimeout(() => resolve({ name: `User ${id}` }), 600)
  );
}

const cache = new Map<string, Promise<{ name: string }>>();
function getUser(id: string) {
  if (!cache.has(id)) cache.set(id, fetchUser(id));
  return cache.get(id)!;
}

function InlineProfile({ id }: { id: string }) {
  renderCountInline++; // shown in the badge
  const user = use(fetchUser(id)); // NEW promise each render
  return <span>{user.name}</span>;
}

function CachedProfile({ id }: { id: string }) {
  renderCountCached++; // shown in the badge
  const user = use(getUser(id)); // SAME promise each render
  return <span>{user.name}</span>;
}
```

Each `Profile` sits inside its own `<Suspense fallback={<Spinner/>}>`.

**Watch:** The cached card resolves after one suspend: it shows "User 1", `renders` settles at 2 (the suspend and the commit), and `requests` stays at 1. The inline card never stops spinning: its `renders` badge climbs without bound and its `requests` counter ticks up on every cycle, visibly demonstrating both the infinite spinner and the API hammering. This is a genuine runtime behavior of `use()` plus Suspense, not an approximation.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Fix `function Profile(){ const u = use(fetchUser(id)) }` by hoisting or caching the promise and passing the stable promise into `use()`. Give the corrected code and say why the original suspends forever.

**Think about:**
- Why does a new promise identity re-suspend?
- Where must the promise be created?
- Can you try/catch use()?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The original suspends forever because `fetchUser(id)` runs during render and returns a new promise object each time. `use()` reads a pending promise, throws it to Suspense (fallback shows), the promise resolves, React re-renders to retry, and `fetchUser(id)` produces a *different* pending promise. There is no render in which `use()` sees a settled promise, so the component never commits and every cycle fires another network request.

Corrected code, caching the promise by `id` so identity is stable:

```tsx
const userCache = new Map<string, Promise<User>>();
function getUser(id: string) {
  let p = userCache.get(id);
  if (!p) {
    p = fetchUser(id);
    userCache.set(id, p);
  }
  return p;
}

function Profile({ id }: { id: string }) {
  const user = use(getUser(id));
  return <h1>{user.name}</h1>;
}
```

**Why at the mechanism level:** `use()` is stateless about your data. It re-reads whatever promise you hand it on the retry render. Suspense resolution only terminates when that read returns a fulfilled value, which requires the *same* promise across the suspend-and-retry. A module-level cache (or a promise created in a parent/Server Component and passed as a prop) survives the re-render, so the retry looks up a fulfilled promise and commits.

**How to spot it in review:** any `use(someFetch(...))` where the fetch call is written inline in the body of a client component. The tell is a function *call* as the argument to `use()` rather than a value that was created elsewhere and passed in.

**Production symptom:** an infinite loading spinner that never resolves, paired with a request-per-frame storm against the API (visible as runaway traffic in the network panel or a spike in backend QPS).

**Common misconception corrected:** `use()` does not create, dedupe, or cache the promise for you. It is a consumer, not a data layer. Caching is your responsibility, whether via a module map, a framework cache like Next.js `cache()`, or a Server Component that creates the promise once.

**Self-check rubric:**
- [ ] I explained that a new promise object each render is the root cause, not the fetch logic itself.
- [ ] My fix creates the promise outside the consuming render (cache, parent, or Server Component).
- [ ] I keyed the cache so different `id`s get different promises but the same `id` reuses one.
- [ ] I named the production symptom as both infinite spinner and repeated network requests.
- [ ] I noted that `use()` does not cache for you and that try/catch cannot handle the pending state.

#### Practice: real-world variant (save, then reveal)

**Prompt:** On a product page team, a `ProductPanel` calls `use(loadProduct(sku))` and each panel spins forever in production but works in a Storybook story that mounts it once. Explain why the story passes but production fails, and design a caching strategy that also invalidates when the product is edited. Give code.

**Model answer (revealed on demand):**

The Storybook story "passes" only in appearance: it mounts the component, sees a spinner, and the reviewer moves on before noticing it never resolves, or the story snapshots the fallback. In production the same infinite suspend loop runs, but now it is visible as a stuck panel and a request storm.

The strategy needs stable identity *and* a way to drop a stale entry when a mutation happens. A module-level map keyed by `sku` gives identity; a version token per sku lets edits invalidate:

```tsx
const productCache = new Map<string, Promise<Product>>();

export function loadProductCached(sku: string) {
  let p = productCache.get(sku);
  if (!p) {
    p = fetchProduct(sku);
    productCache.set(sku, p);
  }
  return p;
}

// call after a successful edit mutation so the next read refetches
export function invalidateProduct(sku: string) {
  productCache.delete(sku);
}

function ProductPanel({ sku }: { sku: string }) {
  const product = use(loadProductCached(sku));
  return <Panel product={product} />;
}
```

**Mechanism:** the cache survives suspend-and-retry so `use()` commits after one settle; `invalidateProduct` removes the entry so the next render creates a fresh promise (a deliberate new identity, which is exactly what you want after an edit).

**How to spot in review:** a `use()` fed by a per-render fetch, plus the absence of any invalidation call in the edit handler (which would leave users staring at stale data forever if you *did* cache).

**Production symptom:** stuck panels and request storms before caching; stale product details after an edit if you cache without invalidation. In practice most teams stop hand-rolling this and adopt React Query or a framework data cache, whose keyed store gives stable identity and tag-based invalidation for free, which is the honest senior recommendation once you have more than one such panel.

### ajr-l7-suspense-boundary-granularity: Suspense reveal order and ErrorBoundary placement

- **id:** `ajr-l7-suspense-boundary-granularity`  ·  **difficulty:** hard  ·  **est:** 14 min  ·  **demo:** react-demo  ·  **skills:** react, suspense, error-boundary

#### Learn

A `<Suspense>` boundary shows its fallback until *every* suspending read anywhere inside it has resolved. That "every" is the whole story of reveal order. If you wrap three independent tiles in one boundary and one tile fetches slowly, the fast two are held hostage behind the fallback until the slow one finishes. The user sees a blank page, then everything at once. Split the boundaries and each tile reveals the moment its own data is ready.

```tsx
// Coarse: one boundary gates all three
<Suspense fallback={<PageSkeleton />}>
  <Sales />    {/* 200ms */}
  <Traffic />  {/* 400ms */}
  <Inventory />{/* 2000ms */}
</Suspense>
```

Here nothing appears for 2000ms even though `Sales` was ready at 200ms. The fix is per-section boundaries:

```tsx
<Suspense fallback={<TileSkeleton />}><Sales /></Suspense>
<Suspense fallback={<TileSkeleton />}><Traffic /></Suspense>
<Suspense fallback={<TileSkeleton />}><Inventory /></Suspense>
```

Now `Sales` pops in at 200ms, `Traffic` at 400ms, `Inventory` at 2000ms. Each boundary only waits for the reads beneath it.

Errors are the second half. A rejected promise consumed by `use()` (or a thrown error during render) is not caught by Suspense. Suspense only handles the *pending* signal. A rejection propagates up until it hits an `<ErrorBoundary>`. If there is no ErrorBoundary, the error unwinds to the root and React unmounts the whole tree: one failing widget blanks the entire page.

The ordering rule that trips people up: **ErrorBoundary must wrap Suspense, not nest inside it.** The reason is timing. The error is thrown while the component is suspending and retrying. If your ErrorBoundary is *inside* the Suspense, the error can escape past the Suspense boundary before the ErrorBoundary is positioned to catch it, and in practice you also lose the ability to show a fallback in the failed region while keeping the layout. Putting the ErrorBoundary outside each Suspense gives you a clean contract: "while pending show the skeleton, if it rejects show a local error card, and either way do not disturb the neighbors."

```tsx
<ErrorBoundary fallback={<TileError />}>
  <Suspense fallback={<TileSkeleton />}>
    <Inventory />
  </Suspense>
</ErrorBoundary>
```

**Interview nuance:** `startTransition` (or `useTransition`) changes reveal behavior on *updates*, not initial mount. When you update state that causes new suspending reads inside a transition, React keeps the *current* UI on screen and does not fall back to the skeleton for the already-shown content. Without a transition, re-suspending on an update flashes the fallback again, which reads as a jarring flicker. So transitions suppress *fallback flashes* on navigation or refetch; they do not speed anything up.

**Interview nuance:** more boundaries are not automatically better. Wrapping every leaf in its own Suspense produces "spinner confetti": a dozen independent skeletons flickering in at slightly different times, which looks noisier and slower than a couple of well-placed boundaries grouping related content. Granularity is a UX decision, not a maximization.

Recap: a Suspense boundary waits for all suspending reads inside it, so split boundaries to let independent sections reveal on their own timelines; put an ErrorBoundary *outside* each Suspense so a rejection shows a local error instead of blanking the page, and use `startTransition` to avoid fallback flashes on updates.

#### See it live

**Demo (react-demo):** A dashboard of three tiles (Sales 200ms, Traffic 400ms, Inventory which rejects at 800ms) rendered two ways: a single outer Suspense with no error handling, versus per-tile Suspense each wrapped in its own ErrorBoundary. A toggle switches between the two layouts.

The widget shows a "Layout: single boundary / per-tile boundaries" toggle and a "Reload" button. Each tile has a delay badge. In single-boundary mode the whole dashboard area is one region; in per-tile mode each tile is independently outlined.

```tsx
function Tile({ label, read }: { label: string; read: () => Data }) {
  const data = read(); // may suspend, may throw
  return <div className="tile">{label}: {data.value}</div>;
}

// A) single coarse boundary, no error boundary
<Suspense fallback={<PageSkeleton />}>
  <Tile label="Sales" read={readSales} />
  <Tile label="Traffic" read={readTraffic} />
  <Tile label="Inventory" read={readInventory} /> {/* rejects */}
</Suspense>

// B) per-tile boundary + ErrorBoundary outside each
{tiles.map(({ label, read }) => (
  <ErrorBoundary key={label} fallback={<TileError label={label} />}>
    <Suspense fallback={<TileSkeleton />}>
      <Tile label={label} read={read} />
    </Suspense>
  </ErrorBoundary>
))}
```

**Watch:** In layout A the entire dashboard shows the page skeleton for the full 800ms, then the Inventory rejection unwinds past the lone Suspense (which cannot catch it), reaches the root, and the whole page is replaced by the crash fallback: Sales and Traffic never render even though their data was ready at 200ms and 400ms. In layout B, Sales pops in at 200ms, Traffic at 400ms, and at 800ms the Inventory tile shows a small local error card while Sales and Traffic stay on screen untouched. This is real Suspense and ErrorBoundary runtime behavior; the only stand-in is the mocked delays and the deliberate rejection.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Wrap the independent dashboard sections in their own Suspense with an ErrorBoundary outside each, so a slow or failing widget does not stall or crash the rest. Rewrite the coarse version and explain what the user sees before and after.

**Think about:**
- What does a Suspense boundary wait for?
- Why must ErrorBoundary wrap Suspense not nest inside?
- How does startTransition avoid fallback flashes?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The coarse version has one Suspense around all three tiles and no ErrorBoundary. A Suspense boundary waits for *all* suspending reads inside it, so the whole dashboard is blank until the slowest tile (Inventory, 2000ms) resolves, wasting the fast tiles that were ready far earlier. And because the Inventory read *rejects*, the error is not caught by Suspense (Suspense only handles pending, not rejection); it unwinds to the root and unmounts the entire page.

Corrected structure, one boundary pair per section:

```tsx
function DashboardTile({ label, read }: { label: string; read: () => Data }) {
  return (
    <ErrorBoundary fallback={<TileError label={label} />}>
      <Suspense fallback={<TileSkeleton />}>
        <Tile label={label} read={read} />
      </Suspense>
    </ErrorBoundary>
  );
}

<div className="dashboard">
  <DashboardTile label="Sales" read={readSales} />
  <DashboardTile label="Traffic" read={readTraffic} />
  <DashboardTile label="Inventory" read={readInventory} />
</div>
```

**Why at the mechanism level:** each Suspense now waits only for the read beneath it, so tiles reveal on independent timelines (200ms, 400ms, 2000ms). The ErrorBoundary sits *outside* its Suspense, so when Inventory's promise rejects the error propagates up and is caught by the ErrorBoundary that owns that region, which renders `TileError` in place. The neighbors are in different subtrees and are never touched. If the ErrorBoundary were nested *inside* the Suspense, the rejection could escape the Suspense boundary before reaching it, and you would be back to a page-level crash.

**How to spot it in review:** a single top-level `<Suspense>` wrapping several unrelated sections, or an `<ErrorBoundary>` written inside a `<Suspense>` rather than around it. Also flag any `use()`-driven tile with no ErrorBoundary anywhere above it.

**Production symptom:** the whole page waits on the slowest fetch (perceived as a slow app even though most data was fast), and any single failed widget blanks or crashes the entire page instead of degrading locally.

**Common misconception corrected:** more boundaries are not always better. Grouping tightly related content under one boundary is often the better UX; spraying a Suspense around every leaf gives you "spinner confetti", a dozen skeletons flickering in out of sync. Granularity is a deliberate UX call, and on *updates* you additionally reach for `startTransition` so re-suspending content keeps the old UI on screen instead of flashing back to skeletons.

**Self-check rubric:**
- [ ] I stated that a Suspense boundary waits for all suspending reads inside it.
- [ ] My fix gives each independent section its own Suspense.
- [ ] I placed each ErrorBoundary outside (wrapping) its Suspense and explained the timing reason.
- [ ] I named both symptoms: slowest-fetch-gates-page and one-failure-blanks-page.
- [ ] I noted that over-nesting causes spinner confetti and that startTransition suppresses fallback flashes on updates.

#### Practice: real-world variant (save, then reveal)

**Prompt:** On a checkout page, the "Recommended add-ons" widget occasionally fails and the whole checkout goes blank, dropping conversions. Meanwhile a "Refresh cart" button flashes the entire order summary back to skeletons every click. Diagnose both and fix them together. Give code.

**Model answer (revealed on demand):**

Two separate mechanisms are in play. The blank checkout is a missing ErrorBoundary: the add-ons widget uses `use()` on a promise that rejects, and with no ErrorBoundary around its region the rejection unwinds to the root and unmounts checkout. The skeleton flash on refresh is a state update that triggers new suspending reads *without* a transition, so React drops the current summary to the fallback while refetching.

Fix both:

```tsx
// 1) Isolate the failure-prone widget so it degrades locally
<ErrorBoundary fallback={<AddOnsUnavailable />}>
  <Suspense fallback={<AddOnsSkeleton />}>
    <RecommendedAddOns cartId={cartId} />
  </Suspense>
</ErrorBoundary>

// 2) Refetch inside a transition so the summary stays on screen
const [isPending, startTransition] = useTransition();
function refreshCart() {
  startTransition(() => {
    setCartVersion(v => v + 1); // triggers new suspending read
  });
}
```

**Mechanism:** the ErrorBoundary catches the add-ons rejection and renders `AddOnsUnavailable` in place, leaving the order summary and pay button fully interactive, so a flaky recommendation service can never block a purchase. For the refresh, `startTransition` marks the state update as non-urgent; React keeps the already-committed summary visible and only swaps in new data when the refetch resolves, with `isPending` available to show a subtle inline spinner instead of a full skeleton wipe.

**How to spot in review:** a revenue-critical region (checkout, pay) with a suspending child and no ErrorBoundary above it is a release blocker. A refetch or filter handler that calls `setState` directly (not wrapped in `startTransition`) on state that feeds a Suspense read is the flash culprit.

**Production symptom:** blank checkout and lost conversions from the uncaught rejection; a jarring full-summary skeleton flash on every refresh that makes the page feel broken even when it works. The senior framing: put error isolation where the money is, and use transitions for any user-initiated update that re-suspends already-visible content.

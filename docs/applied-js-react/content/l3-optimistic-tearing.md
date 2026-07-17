> Module **3.4** (Optimistic Updates & Tearing) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [3.3](./l3-toctou-dedup.md) · Next: [4.1](./l4-mutation-invisible.md)

# L3 · Optimistic Updates & Tearing

Fast UI and correct UI pull against each other, and this is where they collide. After this module you can catch the two subtle failure modes that survive code review: an optimistic update that has no rollback (so a failed request leaves a phantom "liked" on screen), and a hand-rolled external store read during concurrent rendering (so two parts of the same tree show different values of the same data). Both look fine in the happy path and both break exactly when it matters.

### ajr-l3-optimistic-rollback: Optimistic updates and rollback on failure

- **id:** `ajr-l3-optimistic-rollback`  ·  **difficulty:** hard  ·  **est:** 14 min  ·  **demo:** react-demo  ·  **skills:** optimistic, races, useOptimistic

#### Learn

An optimistic update paints the result of an action before the server confirms it, so the UI feels instant. The naive version is one line too short:

```tsx
async function onLike() {
  setLiked(true);          // paint immediately
  setCount((c) => c + 1);
  await api.like(postId);  // no catch, no rollback
}
```

This works until the request fails, and network requests fail: a 500, a dropped connection, a rate limit. When `api.like` throws, nothing un-does the two `setState` calls. The heart stays filled, the count stays incremented, and the screen now disagrees with the database. Refresh the page and the like is gone. That gap between the painted state and the server truth is the bug.

The second, subtler failure is rapid toggling. Suppose the user taps like, unlike, like within 300ms. Three requests go out. They can resolve out of order, and each naive handler blindly sets state based on when *it* returns, not on what the server actually stored. The last paint wins, but the last paint is not the last server confirm. You can end up showing "liked" over a server that recorded "not liked."

The correct mental model has two layers. There is **base state**, which is the last value the server confirmed, and there is an **optimistic overlay**, a temporary guess layered on top for the duration of the in-flight action. The overlay is derived *from* the base state (base + 1), never stored as an independent truth. When the action settles, the overlay is discarded and the component re-derives from the new base state. If the action succeeded, the new base already reflects it. If it failed, the base never changed, so dropping the overlay is the rollback, automatically.

React 19's `useOptimistic` implements exactly this:

```tsx
const [optimisticLiked, addOptimistic] = useOptimistic(
  liked,                              // base state (server truth)
  (_base, next: boolean) => next      // how to apply an optimistic value
);

async function onLike() {
  addOptimistic(!liked);              // overlay, snaps instantly
  const server = await api.toggleLike(postId);
  setLiked(server.liked);             // reconcile base from the response
}
```

`optimisticLiked` shows the overlay while the async action runs, then React automatically drops it when the action finishes and falls back to `liked`. You reconcile `liked` from the server's response, so the last *server confirm* wins regardless of paint order. No manual try/catch rollback, no drift.

**Interview nuance:** the tell that someone understands this is that they reconcile base state from the server *response body*, not from "the request didn't throw." Optimistic UI is not "setState before the await." It is a disposable overlay plus a base state that only the server may advance.

Recap: paint an overlay derived from base state, let it auto-discard on settle, and reconcile base state from the server response so the last confirmed value always wins.

#### See it live

**Demo (react-demo):** a like/unlike button toggled fast against a mock server that fails about 40% of the time, rendered twice side by side, naive `setState` versus `useOptimistic`.

The widget renders two `LikeCard`s reading the same mock API. Each card shows a heart toggle and a like count. A shared "Server truth" badge shows what the mock server has actually stored. There is a "Toggle fast x5" button that fires five rapid toggles, and a request log listing each call as pending, then confirmed or failed. The mock `toggleLike` resolves after a random 150 to 400ms and rejects roughly 40% of the time. Watch the naive card's count and heart drift away from the "Server truth" badge on failures; watch the `useOptimistic` card snap instantly, then reconcile back to match the badge every time.

```tsx
function NaiveLikeCard({ api, postId }: Props) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(0);
  async function onToggle() {
    const next = !liked;
    setLiked(next);                       // paints, never reverts
    setCount((c) => c + (next ? 1 : -1));
    await api.toggleLike(postId, next);   // if this rejects, UI lies
  }
  return <Heart on={liked} count={count} onClick={onToggle} />;
}

function OptimisticLikeCard({ api, postId }: Props) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(0);
  const [optLiked, setOpt] = useOptimistic(liked, (_b, n: boolean) => n);
  async function onToggle() {
    const next = !liked;
    setOpt(next);                         // overlay, auto-reverts on settle
    const server = await api.toggleLike(postId, next); // {liked, count}
    setLiked(server.liked);               // reconcile base from response
    setCount(server.count);
  }
  return <Heart on={optLiked} count={count} onClick={onToggle} />;
}
```

**Watch:** on a failed request the naive card keeps the filled heart and the bumped count while the "Server truth" badge says the opposite; the `useOptimistic` card flashes the optimistic value then reverts to match the badge. This is a real React 19 `useOptimistic` behavior, not a simulation: the overlay is genuinely dropped when the async action settles.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Rewrite this like button so the like shows instantly but reverts on failure and stays correct under rapid toggles. The current code is `setLiked(true); await api.like()` with no rollback and no reconciliation. Give the corrected component and say why the original drifts.

**Think about:**
- What is the optimistic value derived from?
- What must win under rapid toggles: last paint or last server confirm?
- When is the optimistic overlay discarded?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The original has two defects: it hardcodes `true` instead of toggling, and it has no path back when `api.like()` rejects. Under a failure the heart stays filled over a server that never recorded the like. Under rapid toggles, multiple requests race and whichever `setState` paints last wins, even if the server stored the opposite.

```tsx
function LikeButton({ api, postId }: Props) {
  const [liked, setLiked] = useState(false);
  const [optLiked, setOptimistic] = useOptimistic(
    liked,
    (_base, next: boolean) => next
  );

  async function onToggle() {
    const next = !optLiked;
    setOptimistic(next);                      // instant overlay on base state
    try {
      const server = await api.toggleLike(postId, next);
      setLiked(server.liked);                 // reconcile base from response
    } catch {
      // no rollback code needed: base state never advanced,
      // so React drops the overlay back to `liked` on settle.
    }
  }

  return (
    <button aria-pressed={optLiked} onClick={onToggle}>
      {optLiked ? "Liked" : "Like"}
    </button>
  );
}
```

Mechanism: `useOptimistic` returns a value that equals the overlay while an async action is pending and snaps back to the base (`liked`) the moment the action settles. The overlay is *derived* from base state (`!optLiked`), so it is never an independent source of truth. Because you only advance `liked` from the server's response body, the last server confirm wins no matter which request resolves last. The failed branch needs no imperative rollback: since `liked` never changed, discarding the overlay *is* the rollback.

How to spot it in review: an optimistic `setState` with no matching error branch, or a handler that sets final state from "the await didn't throw" rather than from the response body. Also flag storing the optimistic value in the same `useState` you treat as truth, because then there is no base to fall back to.

Production symptom: a failed mutation leaves a phantom like or a count that is off by one, discovered only when the user refreshes and the row snaps back.

Common misconception: "an optimistic update is just setState before the call." It is not. It is a disposable overlay plus a base state that only the server advances. Without that split there is nothing to roll back to.

**Self-check rubric:**
- [ ] The optimistic value is derived from base state, not stored independently.
- [ ] Base state is reconciled from the server response body, not from "no throw."
- [ ] A rejected request results in the UI matching the server (rollback happens).
- [ ] Rapid toggles converge to the last server confirm, not the last paint.
- [ ] No manual snapshot/restore code is needed when using `useOptimistic`.

#### Practice: real-world variant (save, then reveal)

**Prompt:** "Slack-style message send." You render a message list from a server list plus a queue of pending sends. Each send can fail, and a failed message should show a retry affordance, not silently vanish or stay looking sent. Design the optimistic model for a *list* (not a single boolean) using `useOptimistic`, and say how failures surface without corrupting the confirmed list.

**Model answer (revealed on demand):**

Model the list the same way as the boolean: a base state (server-confirmed messages) plus an optimistic overlay (pending sends), where the rendered list is a *derivation* of base plus overlay, never a mutation of base.

```tsx
const [messages, setMessages] = useState<Message[]>(initial);
const [optimistic, addOptimistic] = useOptimistic(
  messages,
  (base, pending: Message) => [...base, { ...pending, status: "sending" }]
);

async function send(text: string) {
  const temp = { id: crypto.randomUUID(), text, status: "sending" as const };
  addOptimistic(temp);                        // appears instantly, greyed
  try {
    const saved = await api.postMessage(text); // server assigns real id
    setMessages((m) => [...m, saved]);         // advance base state
  } catch {
    setFailed((f) => [...f, temp]);            // park it for retry
  }
}
```

Mechanism: `addOptimistic` appends a `sending` entry to the derived list for the duration of the action. When the action settles, React drops the overlay and re-derives from `messages`. On success you have already appended the server's message (with its real id), so the list looks unchanged as the overlay disappears. On failure, `messages` never grew, so the optimistic bubble vanishes on settle; you catch that case and move the message into a separate `failed` array that renders with a red retry button. The confirmed list is never corrupted because base state is only ever advanced by a server response.

How to spot it in review: someone pushing the pending message straight into `messages` (base state) and trying to find-and-replace it later by temp id. That mutates truth with a guess and forces fragile reconciliation. The tell of a correct design is that the pending item lives in the overlay or a separate failed list, and base state only changes on confirmed server writes.

Production symptom of the wrong version: messages that failed to send still appear as delivered, or a reorder/dedupe bug when the optimistic id and the server id both end up in the list.

Interview nuance: at list scale, key stability matters. Keep the temp id stable from optimistic insert through server confirm (or swap deliberately) so React does not remount the row and lose focus or animation state mid-reconcile.

### ajr-l3-concurrent-tearing-sync-store: Concurrent tearing and useSyncExternalStore

- **id:** `ajr-l3-concurrent-tearing-sync-store`  ·  **difficulty:** hard  ·  **est:** 16 min  ·  **demo:** react-demo  ·  **skills:** tearing, useSyncExternalStore, concurrent

#### Learn

"Tearing" is when a single render produces a screen where two components show different values of the *same* piece of data at the *same* moment: one card says 41, its neighbor says 42. In legacy synchronous React this was nearly impossible, because a render ran start to finish in one uninterrupted pass. Concurrent React changed that.

Under concurrent rendering (anything inside `startTransition`, `useDeferredValue`, or Suspense-driven updates), React can pause a render partway, let a more urgent update or the browser run, then resume, and sometimes throw the partial render away and restart. The render is no longer atomic. Now imagine several components reading from a mutable external store during that render. If the store's value changes *between* the moment component A reads it and the moment component B reads it, A commits 41 and B commits 42. The tree tears.

Here is the hand-rolled subscription people write, which is tear-prone:

```tsx
function useStoreValue(store) {
  const [value, setValue] = useState(store.get());   // read at mount
  useEffect(() => store.subscribe(() => setValue(store.get())), [store]);
  return value;
}
```

The problem is timing. `useState(store.get())` captures the value when *that component* first rendered. During a long concurrent render, different components run at different instants, so they capture different snapshots. The `useEffect` subscription only fixes things *after* commit; it does nothing to keep a single in-progress render consistent. So why are `useState` and `useContext` tear-safe but this is not? Because React owns their values. React knows every setState and every context value tied to a render pass, and it guarantees all readers in one commit see one consistent version. A raw external store is invisible to React, so React cannot coordinate its reads.

The fix is to tell React about the store through the official channel, `useSyncExternalStore`:

```tsx
function useStoreValue(store) {
  return useSyncExternalStore(
    store.subscribe,           // (cb) => unsubscribe
    () => store.get(),         // getSnapshot: current value, must be stable if unchanged
    () => store.get()          // getServerSnapshot: for SSR/hydration
  );
}
```

`getSnapshot` gives React a synchronous read it can call and compare. React's contract is that within one commit every consumer sees the same snapshot; if the store mutates mid-render, React detects the changed snapshot and *re-renders synchronously* rather than committing a torn tree. `getSnapshot` must return a referentially stable value when nothing changed (return the same object, do not build a fresh one each call), or you get an infinite loop.

**Interview nuance:** the deeper claim under this is "no side effects in render." People rationalize a `store.get()` plus mutation in render with "the render always commits anyway." Concurrent React breaks that assumption: a render can be discarded and re-run, so anything you do in render must be pure and idempotent. Reads must go through a coordinated snapshot; writes must not happen in render at all.

Recap: concurrent renders are interruptible and restartable, so an uncoordinated external store read tears. `useSyncExternalStore` gives React a snapshot it can keep consistent across every reader in a commit.

#### See it live

**Demo (react-demo):** an external counter store, mutated in the middle of a `startTransition` render and read by several sibling components, hand-rolled subscription versus `useSyncExternalStore`.

The widget shows two rows of three "Reader" boxes each. All six read the same `counterStore`. A "Bump during render" button starts a transition that renders an artificially slow list *and* schedules the store to increment mid-render (via a microtask fired from a render-time counter). The top row uses the naive `useState`+`subscribe` hook; the bottom row uses `useSyncExternalStore`. Each box prints the value it read and a subtle color flags any box whose value differs from its siblings. A "same/torn" badge per row summarizes consistency.

```tsx
// A tiny external store, deliberately outside React's control.
const counterStore = {
  value: 41,
  listeners: new Set<() => void>(),
  get() { return this.value; },
  set(v: number) { this.value = v; this.listeners.forEach((l) => l()); },
  subscribe(cb: () => void) { this.listeners.add(cb); return () => this.listeners.delete(cb); },
};

// A) Naive: captures value per-component at its own render instant.
function useNaive() {
  const [v, setV] = useState(counterStore.get());
  useEffect(() => counterStore.subscribe(() => setV(counterStore.get())), []);
  return v;
}

// B) Tear-safe: React coordinates one snapshot across all readers in a commit.
function useSafe() {
  return useSyncExternalStore(
    counterStore.subscribe.bind(counterStore),
    () => counterStore.get(),
  );
}
```

**Watch:** after "Bump during render," the naive row shows a mix like 41, 42, 41 across its boxes and lights up "torn"; the `useSyncExternalStore` row shows all boxes equal (all 41 or all 42) and stays "same." This demo *approximates* tearing: it forces the store to mutate during a slow transition render to reproduce, on demand, a timing window that in production is rare and non-deterministic. The mechanism it shows is real, but the reliability of triggering it is staged.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Fix the tearing in this component. It reads a hand-rolled external store via `useState`+`subscribe` and is rendered inside a transition, and under load its instances show mismatched values. Convert it to `useSyncExternalStore` and explain why the original tears while `useState`/`useContext` would not.

**Think about:**
- What does concurrent React do to a render that lets tearing happen?
- Why are useState/useContext tear-safe but raw subscriptions not?
- What does getSnapshot guarantee?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The original captures the store value at each component's own render instant and only reconciles after commit, so during a long interruptible render different instances read different values.

```tsx
// Before (tears): value is snapshotted per component, at different times.
function Price({ store }) {
  const [price, setPrice] = useState(store.get());
  useEffect(() => store.subscribe(() => setPrice(store.get())), [store]);
  return <span>{price}</span>;
}

// After (tear-safe): one coordinated snapshot for the whole commit.
function Price({ store }) {
  const price = useSyncExternalStore(
    store.subscribe,        // (cb) => unsubscribe
    () => store.get(),      // getSnapshot, stable when unchanged
    () => store.get(),      // getServerSnapshot for hydration
  );
  return <span>{price}</span>;
}
```

Mechanism: concurrent React can pause, resume, and restart a render, so a render is not atomic. A mutable source read outside React's coordination gets sampled at whatever instant each component happens to run, and those instants can straddle a mutation. `useState` and `useContext` are tear-safe because React owns those values: it knows the version bound to each render pass and guarantees every reader in one commit sees the same version. `useSyncExternalStore` extends that guarantee to an outside store by giving React a `getSnapshot` it can call and compare; if the snapshot changes mid-render, React discards the in-progress render and re-renders synchronously instead of committing a torn tree.

How to spot it in review: any subscription to an external mutable source (a Redux-style store, a global event emitter, `window.matchMedia`, a WebSocket cache) wired with `useEffect`+`useState` instead of `useSyncExternalStore`. Especially dangerous when the reading component sits under `startTransition` or `useDeferredValue`.

Production symptom: two parts of the tree display different values of the same data, most visibly a total that does not match the sum of its line items, or a header count that disagrees with the list below it. It is intermittent and load-dependent, which is why it survives testing.

Common misconception: "side effects in render are fine because the render always commits." Concurrent React can throw a partial render away and re-run it, so reads must go through a coordinated snapshot and writes must never happen in render.

**Self-check rubric:**
- [ ] The store is read through `useSyncExternalStore`, not `useEffect`+`useState`.
- [ ] `getSnapshot` returns a referentially stable value when nothing changed.
- [ ] A `getServerSnapshot` is provided if the component runs during SSR/hydration.
- [ ] The explanation names render interruptibility as the cause of tearing.
- [ ] No store mutation happens during render.

#### Practice: real-world variant (save, then reveal)

**Prompt:** "Live pricing terminal." A trading dashboard subscribes to a global `quoteStore` pushing ticks many times per second. Headline P&L, a positions table, and a summary footer all read the same quotes, and the page uses `useDeferredValue` to keep typing in a filter box smooth. Traders report the footer total occasionally disagreeing with the visible rows. Diagnose it and give a store-shape design that stays consistent and does not thrash.

**Model answer (revealed on demand):**

The footer disagreeing with the rows is classic tearing: quotes mutate during deferred (concurrent) renders, and readers wired with ad hoc subscriptions sample the store at different instants within one interruptible render pass. Under a high tick rate the mutation-during-render window is hit constantly, so it shows up as a footer that is one tick behind the rows.

Fix the subscription first: every quote reader goes through `useSyncExternalStore` so React coordinates one snapshot per commit. But at many ticks per second, `getSnapshot` design matters as much as the hook.

```tsx
function useQuote(symbol: string) {
  return useSyncExternalStore(
    (cb) => quoteStore.subscribe(symbol, cb),   // per-symbol subscription
    () => quoteStore.getSnapshot(symbol),       // returns cached object, stable ref
  );
}
```

Two rules make it correct and cheap. First, `getSnapshot` must return a referentially stable object when the underlying quote has not changed. Cache the last snapshot per symbol inside the store and return the same reference until a real tick arrives, otherwise React sees a "new" value every call and loops or re-renders forever. Second, subscribe per symbol, not to the whole store, so a tick on one instrument does not wake every row. The footer total should be *derived* from the same coordinated snapshots (sum the per-symbol values), not read from a separate `total` field that a writer updates independently, because a separately maintained total is exactly what falls out of sync.

Mechanism: `useSyncExternalStore` guarantees all readers in a commit see one snapshot version, so rows and footer agree even mid-transition. Per-symbol subscriptions and cached snapshots keep the many-ticks-per-second load from thrashing the whole tree.

How to spot it in review: a maintained aggregate (`store.total`) read independently of the line items, or a single store-wide subscription feeding hundreds of rows. Production symptom: an aggregate that lags or disagrees with its components under high update rates, worst exactly when the market is busiest.

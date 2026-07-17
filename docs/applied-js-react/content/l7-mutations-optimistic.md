> Module **7.4** (Mutations) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [7.3](./l7-caching-swr.md) · Next: [7.5](./l7-suspense-use.md)

# L7 · Mutations

An optimistic mutation in React Query is not "write the cache, then fire the request." It is a four-move dance: cancel in-flight refetches, snapshot the old cache, write the optimistic value, and roll back on error. After this module you can catch the one move almost everyone drops, `cancelQueries`, and explain exactly how skipping it lets a background refetch clobber the optimistic write or strand a phantom success on screen after a 500.

### ajr-l7-optimistic-rollback: Optimistic updates and rollback

- **id:** `ajr-l7-optimistic-rollback`  ·  **difficulty:** hard  ·  **est:** 16 min  ·  **demo:** react-demo  ·  **skills:** react-query, optimistic, mutations

#### Learn

React Query's `useMutation` gives you three lifecycle hooks that together form the canonical optimistic pattern: `onMutate`, `onError`, and `onSettled`. Most people can recite that a like button should "update the cache before the server responds." Far fewer get all four moves right, and the one they skip is `cancelQueries`.

Here is the pattern in full, for a like button that writes to a `['post', id]` cache entry:

```tsx
const like = useMutation({
  mutationFn: () => api.like(postId),
  onMutate: async () => {
    // 1. cancel any in-flight refetch of this query
    await queryClient.cancelQueries({ queryKey: ['post', postId] });
    // 2. snapshot the current cache value
    const previous = queryClient.getQueryData(['post', postId]);
    // 3. write the optimistic value
    queryClient.setQueryData(['post', postId], (old) => ({
      ...old, liked: true, likes: old.likes + 1,
    }));
    // 4. hand the snapshot to onError/onSettled via context
    return { previous };
  },
  onError: (_err, _vars, context) => {
    // roll back to the snapshot
    queryClient.setQueryData(['post', postId], context.previous);
  },
  onSettled: () => {
    // reconcile with the server, success or failure
    queryClient.invalidateQueries({ queryKey: ['post', postId] });
  },
});
```

Walk the four moves. `onMutate` runs synchronously before the request goes out. `cancelQueries` stops any refetch that is already flying for this key. `getQueryData` captures the pre-mutation value. `setQueryData` paints the optimistic value into the cache, which re-renders every component reading that key. The object you `return` from `onMutate` becomes the `context` argument in `onError` and `onSettled`, which is how the rollback gets the snapshot.

Now the reason `cancelQueries` is not optional. Suppose a `refetchOnWindowFocus` or a polling interval kicked off a GET for `['post', id]` a moment before the user clicked. That request is in flight. Your `onMutate` writes `likes: 43`. Then the stale background GET resolves carrying `likes: 42` (it left the server before your write landed) and React Query, doing its job, writes that response into the cache. Your optimistic 43 is gone, replaced by a stale 42, even though nothing failed. The screen flickers backward. `cancelQueries` aborts that in-flight GET so it cannot overwrite your optimistic value.

`onError` restores `context.previous`, so a 500 leaves the cache exactly as it was before the click. `onSettled` fires on both success and failure and invalidates the key, triggering a fresh refetch so the cache ends up matching server truth no matter what.

**Interview nuance:** the tell of someone who has actually shipped this is that they mention `cancelQueries` unprompted and can say why. "setQueryData then invalidate" without the cancel is the answer of someone who read a blog post but never watched a background refetch race a mutation.

**Interview nuance:** React 19's `useOptimistic` solves a related but narrower problem, a disposable overlay on local component state that auto-discards when an async action settles. React Query's version is a *cache* mutation shared across every component reading the key, which is why it needs explicit snapshot and rollback: there is no automatic overlay to drop.

Recap: optimistic mutation is four moves. Cancel in-flight queries, snapshot, write optimistic, and roll back on error, then invalidate on settle so the cache reconciles with the server.

#### See it live

**Demo (react-demo):** a like/counter button wired with `onMutate`/`onError`/`onSettled` and a "force fail" toggle, so the learner can drive both the confirm path and the visible rollback.

The widget renders a single `LikeButton` reading a `['post', 1]` query, a heart toggle with a like count next to it, and three controls: a "Force fail (500)" checkbox, a "Background refetch mid-click" checkbox, and the button itself. A horizontal timeline strip animates each click through four labeled beats: `optimistic` (heart fills, count bumps, timeline turns amber), then either `confirmed` (turns green, count sticks) or `error` (a red flash across the card plus a toast reading "Couldn't like, reverted") followed by `rollback` (heart and count snap back) and finally `refetch` (a brief spinner as `invalidateQueries` re-reads). A live "Cache value" badge shows what `getQueryData(['post', 1])` currently holds so the learner can see the optimistic write and the rollback land in the cache itself.

```tsx
function LikeButton() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['post', 1], queryFn: fetchPost });
  const like = useMutation({
    mutationFn: () => api.like(1, { forceFail }),   // toggle drives the 500
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['post', 1] });
      const previous = qc.getQueryData(['post', 1]);
      qc.setQueryData(['post', 1], (o) => ({ ...o, liked: true, likes: o.likes + 1 }));
      return { previous };                          // snapshot -> context
    },
    onError: (_e, _v, ctx) => qc.setQueryData(['post', 1], ctx.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: ['post', 1] }),
  });
  return <Heart on={data.liked} count={data.likes} onClick={() => like.mutate()} />;
}
```

**Watch:** with "Force fail" off, a click fills the heart instantly, the timeline goes amber then green, and the count holds. With "Force fail" on, the same click fills the heart, then the card red-flashes, a toast appears, and the heart and count snap back to their old values as `onError` restores the snapshot. With "Background refetch mid-click" on and `cancelQueries` present, the optimistic value survives; toggling `cancelQueries` off (a second variant in the demo) shows the stale refetch clobbering the optimistic count back down mid-click. This is real React Query lifecycle behavior driven by a mock `api.like` that resolves or rejects on a short timer, not a scripted animation.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Write a mutation with `onMutate` (cancel + snapshot + optimistic), `onError` (restore), and `onSettled` (invalidate), plus a like button that reverts on a 500. Start from this broken version, which does `setQueryData` before the call and nothing else, and say why it leaves a phantom like on failure.

```tsx
const like = useMutation({
  mutationFn: () => api.like(postId),
  onMutate: () => {
    queryClient.setQueryData(['post', postId], (o) => ({ ...o, liked: true }));
  },
});
```

**Think about:**
- Why is `cancelQueries` the step people skip?
- What do you return from `onMutate`?
- How does React 19 `useOptimistic` compare?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The broken version writes the optimistic value but keeps no snapshot and has no error branch, so a failed request leaves `liked: true` sitting in the cache forever. It also skips `cancelQueries`, so an in-flight refetch can overwrite the optimistic write even on success.

```tsx
const like = useMutation({
  mutationFn: () => api.like(postId),
  onMutate: async () => {
    await queryClient.cancelQueries({ queryKey: ['post', postId] });
    const previous = queryClient.getQueryData(['post', postId]);
    queryClient.setQueryData(['post', postId], (old) => ({
      ...old, liked: true, likes: old.likes + 1,
    }));
    return { previous };                 // becomes `context` downstream
  },
  onError: (_err, _vars, context) => {
    queryClient.setQueryData(['post', postId], context.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['post', postId] });
  },
});

function LikeButton({ data }) {
  return (
    <button aria-pressed={data.liked} onClick={() => like.mutate()}>
      {data.liked ? 'Liked' : 'Like'} · {data.likes}
    </button>
  );
}
```

Mechanism: `onMutate` runs before the request. `cancelQueries` aborts any in-flight GET for the key so a stale response cannot land after your optimistic write. `getQueryData` snapshots the pre-click cache, and the object you `return` becomes the `context` argument passed to `onError` and `onSettled`, which is the only channel that carries the snapshot forward. On a 500, `onError` writes `context.previous` back, so the cache returns to exactly its pre-click state. `onSettled` fires on both paths and invalidates the key, forcing a refetch that reconciles the cache with server truth.

How to spot it in review: a `setQueryData` optimistic write with no matching `onError` restore, or no `cancelQueries` at the top of `onMutate`. Both look fine in the happy path. Also flag an `onMutate` that returns nothing, because then `onError` has no snapshot to roll back to.

Production symptom: a failed mutation leaves a phantom success on screen, a heart that stays filled over a server that recorded nothing, discovered only when the user refreshes and it snaps back. The `cancelQueries` omission shows up as an optimistic count that flickers backward mid-click when a background refetch wins the race.

Common misconception: "an optimistic update is just `setQueryData` before the call." It is not. It is cancel, snapshot, write, and roll back on error, then invalidate. React 19's `useOptimistic` is a different tool: it manages a disposable overlay on local state that React drops automatically on settle, so it needs no manual snapshot. React Query mutates shared cache, so the snapshot and rollback are your responsibility.

**Self-check rubric:**
- [ ] `onMutate` calls `cancelQueries` before writing the optimistic value.
- [ ] The pre-mutation value is snapshotted with `getQueryData` and returned as context.
- [ ] `onError` restores `context.previous` so a 500 rolls back.
- [ ] `onSettled` invalidates the key so the cache reconciles with the server.
- [ ] A forced failure leaves the UI matching server truth, no phantom like.

#### Practice: real-world variant (save, then reveal)

**Prompt:** "Trello-style drag to reorder." A board column renders a `['column', id]` cache of ordered cards, and dragging a card fires a mutation to persist the new order. Users drag several cards in quick succession and occasionally a save 500s. Design the optimistic mutation for a *reordered list* so concurrent drags do not corrupt each other and a failed save rolls back only its own change, and say what `cancelQueries` protects here specifically.

**Model answer (revealed on demand):**

Snapshot and rollback still apply, but at list scale with overlapping mutations the snapshot must be captured *per mutation*, not shared, or a rollback from one drag clobbers a later drag's optimistic write.

```tsx
const reorder = useMutation({
  mutationFn: (order: string[]) => api.saveOrder(columnId, order),
  onMutate: async (order) => {
    await queryClient.cancelQueries({ queryKey: ['column', columnId] });
    const previous = queryClient.getQueryData(['column', columnId]);
    queryClient.setQueryData(['column', columnId], (col) => ({
      ...col, cards: order.map((id) => col.cardsById[id]),
    }));
    return { previous };                 // this drag's own snapshot
  },
  onError: (_e, _order, ctx) => {
    queryClient.setQueryData(['column', columnId], ctx.previous);
  },
  onSettled: () => queryClient.invalidateQueries({ queryKey: ['column', columnId] }),
});
```

Mechanism: each `mutate(order)` call gets its own `onMutate` run, so each captures its own `previous` in its own `context`. React Query keys context to the individual mutation instance, so a rollback restores the state as it was *before that specific drag*. Here `cancelQueries` protects two things: the usual stale-refetch race, and the `onSettled` invalidation of an earlier drag whose refetch could otherwise land mid-way through a later drag's optimistic paint. Because each drag cancels in-flight work for the key before writing, the optimistic values stack cleanly instead of racing.

How to spot it in review: a shared snapshot captured once outside the mutation (in a component ref) instead of returned fresh from each `onMutate`, or an `onError` that rebuilds order from scratch instead of restoring `context.previous`. Both cause a late rollback to wipe out good newer state.

Production symptom: cards jumping back to an old order after one save fails, or two rapid drags leaving the column in an order neither user intended, worst under a flaky connection where saves fail and retry constantly. Interview nuance: to avoid a full-list refetch flicker on every settle, some teams debounce the `onSettled` invalidation or only invalidate once the mutation queue is empty, trading immediate consistency for a calmer board.

> Module **11.5** (Reliability & Testing) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [11.4](./l11-state-architecture.md)

# L11 · Reliability & Testing

After this module you can catch the three failures that make React apps look fine in review and fall over in production: error boundaries that were never going to catch the error someone wired them to, mutations that double-write under a retry, and async tests that pass on your machine and flake in CI. Each one is a place where the mental model ("the boundary catches everything below it", "the client guard stops the double click", "the test went green so it works") is wrong at the mechanism level.

### ajr-l11-error-boundaries-limits: Error boundaries do not catch async or event errors

- **id:** `ajr-l11-error-boundaries-limits`  ·  **difficulty:** hard  ·  **est:** 14 min  ·  **demo:** react-demo  ·  **skills:** react, error-boundaries, reliability

#### Learn

An error boundary is a class component with `getDerivedStateFromError` or `componentDidCatch`. React calls those methods when a descendant throws **during the render phase or a lifecycle method**. That is the entire contract. React catches the throw because it is the one calling your component function, so it can wrap that call in a try/catch and, on a throw, unwind to the nearest boundary and render the fallback instead.

The trap is everything that does not run inside that render call:

- **Event handlers.** An `onClick` fires long after render finished, from the browser's event dispatch, not from React's render stack. React is not on the stack when your handler throws.
- **Promises / `.then` / `async` callbacks.** The `await` or `.then` resumes on a later microtask. The render that scheduled it already returned. The throw lands in an empty stack (an unhandled rejection), nowhere near a boundary.
- **`setTimeout` / `setInterval`.** Same story: a fresh macrotask with no React frames beneath it.
- **Server-side rendering** and errors thrown in the boundary's own render.

```tsx
class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) return <Fallback error={this.state.error} onReset={this.props.onReset} />;
    return this.props.children;
  }
}

function Widget() {
  // A) throws in render  -> boundary CATCHES it
  if (mode === 'render') throw new Error('render blew up');

  // B) throws in a handler -> boundary does NOT catch it
  const onClick = () => { throw new Error('handler blew up'); };

  // C) throws in async    -> boundary does NOT catch it (unhandled rejection)
  const load = () => { fetch('/x').then(() => { throw new Error('async blew up'); }); };

  return <>...</>;
}
```

So how do you get an async or handler error to a boundary you already have? You route it back into the render phase. Catch it where it actually throws, put it in state, and re-throw during render:

```tsx
function Widget() {
  const [error, setError] = useState(null);
  if (error) throw error;                // now it throws IN render -> boundary catches it

  const onClick = () => {
    try { doRiskyThing(); }
    catch (e) { setError(e); }            // handler error -> state -> render throw
  };
  const load = async () => {
    try { await fetchThing(); }
    catch (e) { setError(e); }            // async error -> state -> render throw
  };
}
```

The `setError(e)` schedules a re-render; on that render `throw error` runs inside React's call, and the boundary fires. In real apps a data library does this for you: React Query surfaces `query.error` as state, and you either render an error UI or `throw` it up to a boundary. `react-error-boundary` packages the pattern with a `useErrorHandler()`/`showBoundary` for exactly the async case.

Recovery is the other half. A boundary that shows a dead fallback forever is barely better than a white screen. Give the fallback a reset that clears the boundary's error state, and drive re-mounting with `resetKeys` (in `react-error-boundary`) so a route or id change automatically retries.

**Interview nuance:** "an error boundary catches everything below it" is the single most common wrong answer. The precise version, render and lifecycle only, not events, promises, or timers, plus "you route async errors back through state," is the tell of someone who has actually debugged a vanished production error.

Recap: boundaries wrap React's render call, so they catch render/lifecycle throws only. Route handler and async errors into state and re-throw during render, and always give the fallback a reset path.

#### See it live

**Demo (react-demo):** four buttons around one `ErrorBoundary` (throw in render, throw in an `onClick`, throw in a `fetch().then`, then the funnel-fixed async button), with a status panel labeling which throws the boundary actually saw.

The widget renders an `ErrorBoundary` wrapping a `<Widget/>`, plus a right-hand **Boundary status panel** with three rows: "Last error seen by boundary", "Last unhandled rejection (window)", and "Boundary state: ok | caught". Four buttons drive it:

- **Throw in render** flips `mode='render'`; the card is replaced by the red fallback and the panel's "seen by boundary" row updates. Proof the boundary works.
- **Throw in handler** runs `throw` inside `onClick`; the card stays put, nothing appears in the boundary row, and a "Uncaught" toast fires. The panel shows the boundary never saw it.
- **Throw in async** runs `fetch().then(() => throw)`; same result but the "Last unhandled rejection" row lights up (wired to a `window.onunhandledrejection` listener) while the boundary row stays empty.
- **Async, funnel-fixed** does `try/await/catch -> setError(e)`; now the fallback appears and the boundary row updates, proving the routed error reached the boundary. The fallback's **Reset** button clears state and re-mounts the widget.

```tsx
function Widget({ mode }) {
  const [error, setError] = useState(null);
  if (error) throw error;                          // routed async/handler error re-thrown in render
  if (mode === 'render') throw new Error('render'); // caught directly by the boundary

  return (
    <>
      <button onClick={() => { throw new Error('handler'); }}>Throw in handler</button>
      <button onClick={() => { fetch('/x').then(() => { throw new Error('async'); }); }}>Throw in async</button>
      <button onClick={async () => {
        try { await fetch('/x'); throw new Error('async-fixed'); }
        catch (e) { setError(e); }                 // funnel: async error -> state -> render throw
      }}>Async, funnel-fixed</button>
    </>
  );
}
```

**Watch:** the render throw and the funnel-fixed async throw both flip the boundary to its fallback and light the "seen by boundary" row. The raw handler and raw async throws leave the boundary at "ok" and instead surface as a toast / an `unhandledrejection` on `window`. That is the whole lesson made visible: the boundary only ever sees throws that happen inside React's render call.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Wrap a component whose `onClick` throws and whose `fetch().then` throws in an `ErrorBoundary`, demonstrate that neither is caught, then route both async and handler errors into React so the boundary catches them, and add a reset so the user can recover.

**Think about:**
- What does an error boundary actually catch?
- How do you surface an async or handler error to a boundary?
- How do you let users recover?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The boundary catches nothing here, and that is by design. `getDerivedStateFromError` only fires when React itself catches a throw, which only happens for throws inside the render phase or a lifecycle method. The `onClick` throw runs from the browser's event dispatch and the `.then` throw runs on a later microtask; in both cases React's render call has already returned, so there is no boundary frame on the stack to unwind to. The handler throw becomes an uncaught error and the promise throw becomes an unhandled rejection.

The fix is to funnel both error sources into render-phase state and re-throw there:

```tsx
function Panel() {
  const [error, setError] = useState(null);
  if (error) throw error;                    // runs INSIDE render -> boundary catches it

  const onClick = () => {
    try { riskySync(); }
    catch (e) { setError(e); }
  };
  const load = async () => {
    try { const r = await fetch('/data'); if (!r.ok) throw new Error(r.status); }
    catch (e) { setError(e); }               // no throw escapes async; we capture and re-render
  };
  return <button onClick={onClick}>…</button>;
}

// Boundary with reset:
<ErrorBoundary resetKeys={[routeId]} fallbackRender={({ error, resetErrorBoundary }) => (
  <Fallback error={error} onRetry={resetErrorBoundary} />
)}>
  <Panel />
</ErrorBoundary>
```

**Mechanism:** `setError(e)` schedules a re-render. On that render, `if (error) throw error` executes while React is calling `Panel`, so React catches it and swaps in the fallback. You have moved the throw from a stack React cannot see to one it can.

**How to spot it in review:** any `ErrorBoundary` wrapped around a component whose failure path is an event handler, a `fetch`, a `setTimeout`, or a subscription callback, with no state-funnel or data-library error state in between. If the risky code is not on the render path, the boundary is decorative.

**Production symptom:** users report "the button just does nothing" or a feature silently fails, and your monitoring shows unhandled rejections but your boundary's fallback never rendered. The error crossed the boundary invisibly.

**Common misconception, corrected:** "an error boundary catches everything below it in the tree." No. It catches render and lifecycle throws of its descendants only. Async and event errors must be caught where they occur and pushed into React state to reach it.

**Self-check rubric:**
- [ ] I stated that boundaries catch render/lifecycle throws only, not events/promises/timers.
- [ ] My fix stores the error in state and re-throws it during render.
- [ ] I wrapped the async and handler code in try/catch that calls the setter.
- [ ] I added a reset (resetErrorBoundary / resetKeys) so the user can recover.
- [ ] I named the production symptom: the fallback never renders while errors escape as unhandled rejections.

#### Practice: real-world variant (save, then reveal)

**Prompt:** "Checkout meltdown." Your `<CheckoutForm/>` is wrapped in an app-level `ErrorBoundary`. During a Stripe outage, `await stripe.confirmPayment()` rejects inside the submit handler. Users see the button spin, stop, and nothing else: no fallback, no error. Sentry shows a spike of unhandled rejections but the boundary's fallback event count is zero. Explain precisely why the boundary is silent, fix it so payment failures show a recoverable error UI, and make sure a real bug in render still crashes to the boundary rather than being swallowed.

**Model answer (revealed on demand):**

The boundary is silent because `confirmPayment()` rejects on a microtask after the submit handler's synchronous part returned. React's render call is long gone, so the rejection has no boundary frame to unwind into; it becomes an unhandled rejection, which is exactly what Sentry is counting. No amount of wrapping the tree will change that, the error never enters React's render path.

Fix by catching at the await and funneling into state, then re-throwing during render:

```tsx
function CheckoutForm() {
  const [payError, setPayError] = useState(null);
  if (payError) throw payError;                   // route to boundary during render

  const onSubmit = async () => {
    setSubmitting(true);
    try {
      const { error } = await stripe.confirmPayment(/* … */);
      if (error) throw new PaymentError(error.message, error.code);
    } catch (e) {
      setPayError(e);
    } finally {
      setSubmitting(false);
    }
  };
}
```

**But** re-throwing every payment failure to a full-screen boundary is bad UX: a declined card is a recoverable, inline condition, not an app crash. So split by severity. Expected, user-actionable failures (card declined, `card_error`/`validation_error`) go to *inline* form state and never touch the boundary. Only unexpected failures (network down, Stripe SDK exception, 5xx) get funneled to the boundary:

```tsx
catch (e) {
  if (e instanceof PaymentError && e.userActionable) setInlineError(e.message);
  else setPayError(e);            // only unexpected errors escalate to the boundary
}
```

**Mechanism / how to spot / symptom:** the tell in review is `await`ed SDK calls whose only failure handling is a `try/catch` that logs, plus a top-level boundary the team believes will "catch payment errors." The production symptom is precisely this one: a spinner that resolves to nothing while rejections pile up in monitoring. The subtle part most people miss is the severity split. A boundary that catches *everything* including declined cards trades a silent failure for an over-aggressive full-page crash on a routine decline. Give the boundary a `resetKeys={[cartId]}` and a "Try again" so a genuine outage is recoverable once Stripe is back.

**Self-check rubric:**
- [ ] I explained the microtask/stack reason the rejection skips the boundary.
- [ ] My fix catches at the await and re-throws through render state.
- [ ] I split expected (inline) from unexpected (boundary) failures.
- [ ] I preserved genuine render crashes reaching the boundary.
- [ ] I added a reset path for recovery after the outage.

### ajr-l11-race-safe-mutations: Race-safe mutations: retries and idempotency on the client

- **id:** `ajr-l11-race-safe-mutations`  ·  **difficulty:** hard  ·  **est:** 14 min  ·  **demo:** react-demo  ·  **skills:** react, races, idempotency

#### Learn

A mutation is not safe just because you disabled the button. Disabling stops the *second click*; it does nothing about the *first request being retried*. The moment you add retries (your fetch wrapper, React Query's `retry`, a user who refreshes, a flaky network that delivers a request twice), a single user intent can hit the server two, three, five times. Without a server-side dedup mechanism, that is two, three, five writes: a double charge, a doubled like, two rows in the orders table.

The only durable fix is an **idempotency key**: a stable id that represents the *intent*, sent with every attempt, that the server uses to dedup. Stripe's API is the canonical example (`Idempotency-Key` header). The rules that make it work:

- **Stable per intent, not per request.** Generate the key once when the user forms the intent (one key for "submit this order"), and reuse it across every retry. If you generate a fresh key per attempt, you have defeated the entire mechanism.
- **The server deduplicates.** On first receipt it does the write and records `key -> result`. On any later receipt of the same key it returns the *stored* result without re-doing the write. The client cannot guarantee this alone; a client guard only shrinks the window.

```tsx
// stable key per intent, reused across retries
const intentKey = useRef(crypto.randomUUID());   // one key for this submit intent

async function submit(payload) {
  return fetchWithRetry('/orders', {
    method: 'POST',
    headers: { 'Idempotency-Key': intentKey.current },  // SAME key on every retry
    body: JSON.stringify(payload),
  });
}
```

The second half is optimistic UI reconciliation. When you show the like as applied before the server confirms, you are displaying a *guess*. When the server settles, the **last server-confirmed value must win**, because rapid toggles and retries mean your guess and the truth can diverge. Concretely: user clicks like (guess: 43), clicks unlike (guess: 42), and the server, having deduped and applied only the net intent, confirms 43. Your local guess of 42 is wrong; you must reconcile to the server's 43.

React 19's `useOptimistic` handles the common case, but it has a sharp edge:

```tsx
const [optimisticLikes, addOptimistic] = useOptimistic(serverLikes);
// inside an action:
addOptimistic(serverLikes + 1);
await likeOnServer();   // when this action settles, React drops the overlay and shows serverLikes
```

`useOptimistic` reverts the overlay only when the action settles **and the underlying value it reads has updated**. The overlay is a temporary layer on top of `serverLikes`; when the action finishes, the overlay is discarded and you see `serverLikes` again. If your server call is a **silent no-op** (it succeeded but did not change the canonical value, or you never re-read it, or the passed value is `===` identical), there is nothing new to fall back to, and the optimistic guess can appear to "stick." The fix is to make sure the action actually refreshes the canonical state (return the new value / revalidate) so the overlay drops onto fresh truth.

**Interview nuance:** "I disable the button so it can't double-submit" is a junior answer. The senior answer names retries as the real threat, reaches for a stable idempotency key with server-side dedup, and adds "the client guard only narrows the window."

Recap: retries, not double clicks, cause double writes; defend with a stable-per-intent idempotency key and server dedup. For optimistic UI, reconcile to the last server-confirmed value, and remember `useOptimistic` only reverts when the canonical state it overlays actually changes.

#### See it live

**Demo (react-demo):** a like/submit button hitting a mocked flaky server (fails ~50% then the wrapper retries), shown twice, naive (no key) vs idempotency-key, with two live counters: **client attempts** and **server-applied**.

The widget renders two side-by-side panels, **Naive** and **Idempotency key**, each with a like button, a "server-applied likes" readout, and a "client attempts" readout. A "Flakiness" slider sets the mocked server's failure rate; a wrapper retries failed attempts up to 3 times. Under the two panels a small **reconciliation strip** shows the optimistic guess and the server-confirmed value converging.

- In **Naive**, each retry sends a request with a fresh id, so the server treats each as a new write. Click once with flakiness high: **client attempts** climbs to 3 while **server-applied** climbs to 2 or 3. Duplicate writes, visible.
- In **Idempotency key**, every retry sends the same `Idempotency-Key`. **client attempts** climbs to 3, **server-applied stays at 1**. The strip shows the optimistic guess snapping to the single server-confirmed value on settle.
- A **"toggle fast"** button double-taps like/unlike so the learner sees the optimistic guess reconcile to the last server-confirmed value rather than to the local guess.

```tsx
function useLike(useIdempotency) {
  const key = useRef(crypto.randomUUID());
  const [serverLikes, setServerLikes] = useState(0);
  const [optimistic, addOptimistic] = useOptimistic(serverLikes);
  const [attempts, setAttempts] = useState(0);

  async function like() {
    addOptimistic(serverLikes + 1);                      // guess
    const idem = useIdempotency ? key.current : crypto.randomUUID(); // stable vs per-request
    const confirmed = await fetchWithRetry('/like', {
      headers: { 'Idempotency-Key': idem },
      onAttempt: () => setAttempts((n) => n + 1),
    });
    setServerLikes(confirmed.likes);                     // reconcile to server truth
  }
  return { optimistic, serverLikes, attempts, like };
}
```

**Watch:** with the same intent retried three times, the naive server-applied counter climbs past 1 while the idempotency-key one stays pinned at 1 despite identical client attempts. That is server-side dedup on a stable key made visible. The reconciliation strip shows the optimistic overlay landing on the single confirmed value, not on your local guess, which is the last-writer-wins rule in action.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Make a like/submit mutation race-safe under retries and rapid toggles: give it a stable idempotency key so retries do not double-write, reconcile the optimistic UI to the last server-confirmed value, and explain when `useOptimistic` silently fails to revert.

**Think about:**
- What does a stable idempotency key guarantee?
- When must the last server-confirmed value win?
- When does `useOptimistic` fail to revert?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

```tsx
function LikeButton({ postId }) {
  const key = useRef(crypto.randomUUID());          // ONE key per intent, survives retries
  const [server, setServer] = useState({ likes: 0, liked: false });
  const [optimistic, addOptimistic] = useOptimistic(server);

  async function toggle() {
    const next = { likes: server.likes + (server.liked ? -1 : 1), liked: !server.liked };
    addOptimistic(next);                            // show the guess
    const confirmed = await fetchWithRetry(`/posts/${postId}/like`, {
      method: 'POST',
      headers: { 'Idempotency-Key': key.current },  // same key on every retry
      body: JSON.stringify({ liked: next.liked }),
    });
    setServer(confirmed);                           // reconcile: last server value wins
  }
  return <Heart on={optimistic.liked} count={optimistic.likes} onClick={toggle} />;
}
```

**A stable idempotency key guarantees** that no matter how many times the network or the client re-sends this one intent, the server applies the write once. The server stores `key -> result` on first receipt and returns the stored result for every subsequent request with that key. Generate it once per intent and reuse it; a per-request key guarantees nothing.

**The last server-confirmed value must win** whenever the optimistic guess and the truth can diverge, which is exactly under rapid toggles and retries. If you like then unlike quickly, your local arithmetic can land on a different number than the server's net, deduped result. Assigning `setServer(confirmed)` from the response, rather than trusting your local counter, is what keeps the UI honest.

**`useOptimistic` fails to revert** when the action settles but the canonical value it overlays did not change. The overlay is dropped on settle and React shows the underlying state again; if that underlying state is unchanged (a silent no-op success, you forgot to update it from the response, or the new value is referentially identical), the screen appears to keep the guess. The fix is to always refresh the canonical state from the server response or revalidate the source, so the overlay drops onto fresh truth.

**How to spot in review:** a retried or auto-retrying mutation with no idempotency/dedup key; optimistic `setState` that never assigns from the server response; a `useOptimistic` action whose async call can succeed without updating the base state.

**Production symptom:** duplicate charges/likes/orders under flaky networks, and a "stuck" optimistic value that never reconciles (the phantom like that stays lit after a no-op).

**Misconception, corrected:** "a client guard (disabled button / in-flight flag) prevents double-writes." It only narrows the window; retries and at-least-once delivery still duplicate. Only server-side dedup on a stable key actually prevents the second write.

**Self-check rubric:**
- [ ] One idempotency key generated per intent and reused across retries.
- [ ] Server response, not local arithmetic, is what I reconcile to.
- [ ] I explained useOptimistic reverts only when the base state changes.
- [ ] I named retries (not double clicks) as the real double-write threat.
- [ ] I stated the client guard is a window-narrower, not a guarantee.

#### Practice: real-world variant (save, then reveal)

**Prompt:** "Double-charge incident." Your checkout's payment `POST` is wrapped in a retry helper that retries on network error and 5xx. During a partial outage, some charges succeed on the server but the response times out, so the client retries and a subset of users get charged twice. Support is flooded. Design the end-to-end idempotency so a retried charge applies once, decide what the client renders while the true outcome is unknown, and explain why "retry on 5xx" made it worse.

**Model answer (revealed on demand):**

The core failure is at-least-once delivery with a non-idempotent write. A timeout does not tell the client whether the charge succeeded; the request may have completed on the server and only the *response* was lost. "Retry on 5xx / network error" then re-sends a charge that already went through. Without server dedup, the second attempt is a second charge.

Fix, end to end:

```tsx
// client: one key per checkout intent, reused across every retry of THIS charge
const idemKey = useRef(crypto.randomUUID());
await fetchWithRetry('/charge', {
  method: 'POST',
  headers: { 'Idempotency-Key': idemKey.current },
  body: JSON.stringify({ cartId, amount }),
});
```

```
server (pseudo):
  row = db.upsert_if_absent(idem_key, status='in_progress')   // atomic insert
  if row.existed:
     if row.status == 'succeeded': return row.result          // dedup: return prior outcome
     if row.status == 'in_progress': return 409 / poll        // concurrent duplicate
  result = charge(); db.update(idem_key, 'succeeded', result); return result
```

The server records the key **before** charging, atomically, so a concurrent duplicate (two retries in flight at once) collides on the insert and does not double-charge. On a repeat after success it returns the stored result, so the retried request is a safe read.

**What the client renders while unknown:** not "failed." A timeout is an *indeterminate* state. Show "Confirming your payment…", then reconcile by GETting the charge status by idempotency key (or via a webhook-updated order record). Only surface success or a real failure once the server's canonical outcome is known. Rendering "payment failed" on timeout is what pushes users to re-submit and manufactures the double charge from the UI side.

**Why "retry on 5xx" made it worse:** it turned an ambiguous outcome into a guaranteed re-send of a non-idempotent write. Retries are only safe on idempotent operations; adding a key is what *makes* the charge idempotent so the retry becomes harmless. The nuance most people miss: idempotency and retry are a package. You cannot safely add one without the other. Cap retries with jittered backoff, and treat the key as covering the whole intent lifecycle, including the reconciling status read.

**Self-check rubric:**
- [ ] Key generated once per intent and sent on every retry.
- [ ] Server records the key atomically before the write, returns stored result on repeat.
- [ ] Timeout treated as indeterminate; UI shows "confirming", not "failed".
- [ ] I explained retries are safe only once the write is idempotent.
- [ ] Concurrent-duplicate (in-flight) case handled, not just sequential retry.

### ajr-l11-testing-async-races: Testing async effects, races, and act() warnings

- **id:** `ajr-l11-testing-async-races`  ·  **difficulty:** hard  ·  **est:** 14 min  ·  **demo:** js-runnable  ·  **skills:** testing, async, races

#### Learn

The number one cause of flaky async tests is asserting before the state has settled. You render a component that fetches, then immediately call `getByText('42')`. Sometimes the mocked fetch resolves fast enough that the DOM already updated; sometimes it does not, and you get a "not found." Same test, same code, different result depending on microtask timing and machine load. That is the definition of flake, and a `getBy*` right after render on async UI is where it lives.

The fix is to *wait for the settled state* instead of snapshotting the transient one:

- **`findBy*`** returns a promise that retries the query until the element appears or times out. `await screen.findByText('42')` waits for the fetch to land.
- **`waitFor(() => expect(...))`** retries an assertion until it passes.
- Never `getBy*` immediately for something that arrives asynchronously.

```tsx
// FLAKY: asserts on the transient pre-fetch DOM
render(<Profile id={1} />);
expect(screen.getByText('Ada')).toBeInTheDocument();   // sometimes not there yet

// STABLE: waits for the settled DOM
render(<Profile id={1} />);
expect(await screen.findByText('Ada')).toBeInTheDocument();
```

The **`act()` warning** ("An update to X inside a test was not wrapped in act(...)") is React telling you a state update happened *after your test thought it was done*. `act()` is the boundary that flushes pending state updates and effects so your assertions see a consistent tree. When a late `setState` (from a resolved promise or a timer) fires outside any `act()` scope, React warns that your test moved on while the component was still updating. Awaiting `findBy`/`waitFor` wraps that settling in `act()` for you, which is why the warning usually disappears once you stop asserting synchronously.

Mock the network at the boundary with **MSW** (Mock Service Worker) rather than stubbing `fetch` per test. MSW intercepts real requests, so your component runs its real fetch code, and you get one request handler shared across tests. It also lets you script *ordering*, which is how you test races deterministically.

To force a race, control time. With `jest.useFakeTimers()` (or MSW `delay`), you can make the response for `id=2` resolve **before** the response for `id=1`, reproducing the out-of-order/stale-response bug on demand:

```tsx
// resolve id=2 before id=1 to test the stale-response guard
server.use(
  http.get('/user/1', async () => { await delay(50); return HttpResponse.json({ name: 'first' }); }),
  http.get('/user/2', async () => { await delay(10); return HttpResponse.json({ name: 'second' }); }),
);
```

**Interview nuance:** "the test passed" is not "the test is reliable." A flaky async test can pass 30 out of 50 runs; a single green run tells you nothing about the other 20. The senior instinct is to distrust a passing async test that used a synchronous assertion, and to prove reliability by running it many times or by removing the timing dependency entirely.

Recap: flake comes from asserting before state settles, so `await findBy`/`waitFor`. `act()` warnings mean a late state update escaped your test's flush window. Mock at the boundary with MSW and control time with fake timers to test out-of-order races deterministically.

#### See it live

**Demo (js-runnable):** run the same async "test" 50 times, once with a synchronous assert right after render, once with a `waitFor`-style poll, and count passes. The runner logs a pass/fail tally per variant so you can see the flake rate.

```js
// Deterministic model of a flaky async test vs a waitFor-style test.
// "render" schedules a state update after a variable microtask/timer delay.
// A) asserts immediately (before settle). B) polls until settled (waitFor).

function renderWithAsyncUpdate() {
  const box = { text: 'loading' };
  // settle after a jittered delay, mimicking a mocked fetch resolving
  const delay = Math.random() < 0.6 ? 0 : 4; // ~60% settle on the same tick, ~40% later
  setTimeout(() => { box.text = '42'; }, delay);
  return box;
}

// A) naive: assert on the next microtask, often before the timer fired
async function naiveTest() {
  const box = renderWithAsyncUpdate();
  await Promise.resolve();          // a microtask, like a bare `await` in a test
  return box.text === '42';         // getBy immediately -> flaky
}

// B) waitFor: poll until settled or time out
async function waitForTest() {
  const box = renderWithAsyncUpdate();
  const start = performance.now();
  while (box.text !== '42' && performance.now() - start < 1000) {
    await new Promise((r) => setTimeout(r, 1)); // retry, like findBy/waitFor
  }
  return box.text === '42';
}

async function run(label, testFn) {
  let pass = 0;
  const t0 = performance.now();
  for (let i = 0; i < 50; i++) if (await testFn()) pass++;
  const ms = (performance.now() - t0).toFixed(1);
  console.log(`${label}: ${pass}/50 passed  (${ms}ms)`);
}

await run('A) synchronous assert (naive)', naiveTest);
await run('B) waitFor poll (stable)     ', waitForTest);

// Bonus: an act()-style late-update warning, illustrated.
function componentWithLateSetState(onWarn) {
  let mounted = true;
  setTimeout(() => {
    if (!mounted) onWarn('Warning: An update to Profile inside a test was not wrapped in act(...)');
  }, 5);
  return { unmount() { mounted = true; } }; // test ended but timer still pending -> warning
}
componentWithLateSetState((w) => console.log(w));
await new Promise((r) => setTimeout(r, 10));
```

**Watch:** variant A prints something like `~30/50 passed` and variant B prints `50/50 passed`, on the same underlying async behavior. That is the flake made quantitative: the only difference is A asserts on the next microtask while B polls until the state settles. The bonus block logs an `act()`-style warning to illustrate a state update firing after the test moved on. Note this is a deterministic *model* of React's scheduling using `setTimeout` jitter, not a real React render tree, but the timing relationship (assert-before-settle vs poll-until-settled) is exactly the one that flakes real tests.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Rewrite a flaky test that asserts immediately after render so it awaits `findBy`/`waitFor` and mocks the network with MSW, then add a second test that forces the stale-response race (resolve `id=2` before `id=1`) and asserts the UI shows `id=2`'s data, not `id=1`'s.

**Think about:**
- What is the number one cause of flaky async tests?
- What does `act()` ensure?
- How do you force a race ordering in a test?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

```tsx
import { http, HttpResponse, delay } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer();
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// 1) De-flaked: await the settled DOM instead of snapshotting the transient one.
test('shows the fetched name', async () => {
  server.use(http.get('/user/1', () => HttpResponse.json({ name: 'Ada' })));
  render(<Profile id={1} />);
  expect(await screen.findByText('Ada')).toBeInTheDocument(); // findBy waits + wraps in act()
});

// 2) Stale-response race: make id=2 resolve BEFORE id=1, assert last-requested wins.
test('ignores a stale response from a superseded id', async () => {
  server.use(
    http.get('/user/1', async () => { await delay(50); return HttpResponse.json({ name: 'first' }); }),
    http.get('/user/2', async () => { await delay(10); return HttpResponse.json({ name: 'second' }); }),
  );
  const { rerender } = render(<Profile id={1} />);
  rerender(<Profile id={2} />);                 // supersede id=1 before it resolves
  expect(await screen.findByText('second')).toBeInTheDocument();
  // and the stale id=1 response must never clobber it:
  await delay(60);
  expect(screen.queryByText('first')).not.toBeInTheDocument();
});
```

**The number one cause of flake** is asserting before state settles: a `getBy*` right after render races the mocked fetch's resolution. `findBy*`/`waitFor` fix it by retrying until the settled DOM appears.

**`act()` ensures** that all pending state updates and effects are flushed and applied before your assertions run, so the test observes a consistent React tree. Awaiting `findBy`/`waitFor` performs that flush; a warning means a `setState` fired outside any act scope, i.e. after the test moved on.

**To force the race ordering** you control timing: MSW `delay` (or fake timers) makes `id=2` resolve before `id=1`. The second test proves the component uses the last-requested response and drops the stale one, the exact production bug an immediate synchronous assertion would never catch.

**How to spot in review:** synchronous `getBy*` assertions immediately after rendering async UI; tests with no network boundary (ad hoc `fetch` mocks) and no ordering control; a suite with zero tests that exercise the stale/out-of-order path.

**Production symptom:** flaky CI that "passes on re-run" (eroding trust in the suite) and, worse, untested race/rollback paths that ship real out-of-order bugs to users.

**Misconception, corrected:** "it passed, so the async test is reliable." A flaky test can pass most runs; one green run is not evidence of reliability. Prove it by removing the timing dependency (await the settled state) or by running it many times.

**Self-check rubric:**
- [ ] Replaced synchronous getBy with awaited findBy/waitFor.
- [ ] Mocked the network at the boundary with MSW, not per-call fetch stubs.
- [ ] Added a test that forces id=2 to resolve before id=1.
- [ ] Asserted the stale response never overwrites the current one.
- [ ] Explained act() flushes updates/effects before assertions.

#### Practice: real-world variant (save, then reveal)

**Prompt:** "Flaky CI quarantine." Your team has 12 async tests that fail intermittently, so someone added `jest.retryTimes(3)` to make CI green. New race bugs are now shipping. Diagnose why retrying tests is the wrong fix, convert one representative flaky test (a typeahead that fires a request per keystroke and must render only the last result) into a deterministic test that would actually *catch* an out-of-order bug, and say how you would stop new flake from entering the suite.

**Model answer (revealed on demand):**

`jest.retryTimes(3)` treats flake as noise to be papered over. But flake and a real race bug are the same signal: order-dependent, timing-dependent behavior. Retrying until green *hides* the race bug the test was accidentally exercising, which is exactly why new races started shipping. You have configured CI to ignore the one class of failure you most need to see.

Convert the typeahead to a deterministic ordering test with controlled time:

```tsx
test('typeahead renders only the last keystroke\'s results', async () => {
  server.use(
    http.get('/search', async ({ request }) => {
      const q = new URL(request.url).searchParams.get('q');
      await delay(q === 'ab' ? 50 : 10);          // "ab" (older) resolves AFTER "abc"
      return HttpResponse.json({ q, results: [`${q}-result`] });
    }),
  );
  render(<Typeahead />);
  const input = screen.getByRole('searchbox');
  await userEvent.type(input, 'ab');              // fires /search?q=ab (slow)
  await userEvent.type(input, 'c');               // fires /search?q=abc (fast)
  expect(await screen.findByText('abc-result')).toBeInTheDocument();
  await delay(60);                                // let the stale "ab" response arrive
  expect(screen.queryByText('ab-result')).not.toBeInTheDocument();
});
```

This deterministically forces the older request to resolve last, so a component without an abort/last-write guard fails *every* run, not one in five. That converts flake into a hard, reproducible assertion. The component fix it drives is an `AbortController` per keystroke (or a request-id guard that ignores responses for superseded queries).

**How to stop new flake entering the suite:** ban `retryTimes` and bare synchronous assertions on async UI (lint rule / ESLint `testing-library` plugin), require MSW at the boundary, and run the async suite N times in CI (a "flake hunter" job) so a test that is not deterministic fails the PR. The mindset shift: a flaky test is a bug report about your code's timing behavior, not a CI annoyance. Fix the determinism or fix the race; never retry past it.

**Self-check rubric:**
- [ ] Explained retryTimes hides real race bugs (flake == race signal).
- [ ] Forced the older request to resolve last, deterministically.
- [ ] Test fails every run without a last-write/abort guard.
- [ ] Named the component fix (AbortController / request-id guard).
- [ ] Gave a prevention mechanism (lint + N-run flake hunter) for new flake.

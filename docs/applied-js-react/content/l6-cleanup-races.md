> Module **6.2** (Cleanup & Races) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [6.1](./l6-dependency-array.md) · Next: [6.3](./l6-avoid-effects.md)

# L6 · Cleanup & Races

After this module you will catch the three effect bugs that survive code review and only surface in production: a subscription that never tears down (and doubles under StrictMode), a fetch that paints the wrong user after a fast click, and an `async` effect whose returned Promise quietly disables cleanup entirely. Each lesson centers on real code you run and a demo you watch fail before you fix it.

### ajr-l6-cleanup-subscription-leak: Cleanup and subscription leaks (double-fire in StrictMode)

- **id:** `ajr-l6-cleanup-subscription-leak`  ·  **difficulty:** intermediate  ·  **est:** 14 min  ·  **demo:** react-demo  ·  **skills:** react, cleanup, subscriptions

#### Learn

An effect that opens a resource must close the exact same resource. When you subscribe to a socket, add an event listener, or start an interval, `useEffect` gives you one place to undo it: the function you return. Skip that return and the resource outlives the component. Every mount opens a new one, every dependency change opens another, and nobody ever closes the old ones.

Here is the leak in its natural habitat:

```tsx
useEffect(() => {
  const socket = connect(userId);
  socket.on("message", (m) => setMessages((prev) => [...prev, m]));
  // no return: nothing ever closes `socket`
}, [userId]);
```

React runs cleanup at two moments: before it re-runs the effect (because a dependency changed) and once when the component unmounts. With no return, both moments do nothing. Change `userId` from `1` to `2` and you now have two live sockets, both pushing into `setMessages`. The user sees each new message appended twice, then three times after the next switch.

The fix is symmetry. Whatever setup opened, cleanup closes, using the same reference:

```tsx
useEffect(() => {
  const socket = connect(userId);
  const onMessage = (m) => setMessages((prev) => [...prev, m]);
  socket.on("message", onMessage);
  return () => {
    socket.off("message", onMessage);
    socket.close();
  };
}, [userId]);
```

Note `onMessage` is a named reference. A common variant of this bug is `socket.on("message", (m) => ...)` in setup and `socket.off("message", (m) => ...)` in cleanup: two different arrow instances, so `off` removes nothing and the handler leaks anyway. `removeEventListener` has the exact same trap.

**Interview nuance:** React StrictMode in development intentionally runs your effect setup, then cleanup, then setup again on the first mount. This is not a bug and it is not something to silence. It is a smoke test: if your teardown is correct, the double invoke settles cleanly at one live resource; if it is missing or asymmetric, you watch the connection count climb to 2 and stay there. Removing StrictMode to make the double invoke "go away" hides the exact defect StrictMode exists to reveal, and the leak still ships to production where React 18 concurrent features can remount for real.

The mental model to carry into review: an effect body should be reversible and idempotent. Ask "if this runs, gets torn down, and runs again, is the world the same as running it once?" A subscribe with a matching unsubscribe passes. A subscribe with no return fails. A guard like `if (hasRun) return;` also fails, because it fakes idempotency by refusing to run the second time instead of making the second run safe, which breaks the moment the dependency legitimately changes.

Recap: return a cleanup that reverses setup using the same references; symmetric teardown is what makes StrictMode's double invoke settle at one resource instead of two.

#### See it live

**Demo (react-demo):** a subscription effect with no return, mounted and unmounted repeatedly, with a live active-connections meter next to a connect/disconnect trace log.

The widget renders a toggle button ("Mount chat" / "Unmount chat"), a dropdown to switch `userId` (Ava / Ben / Cy), a big **Active connections: N** meter, and a scrolling trace of `connect(id)` and `disconnect(id)` lines. A "StrictMode" checkbox wraps the child so the learner can see the double invoke on and off. The child is built around this:

```tsx
function ChatSocket({ userId }: { userId: string }) {
  const [messages, setMessages] = useState<string[]>([]);
  useEffect(() => {
    const socket = fakeConnect(userId);        // meter += 1, trace "connect"
    const onMessage = (m: string) => setMessages((p) => [...p, m]);
    socket.on("message", onMessage);
    return () => {
      socket.off("message", onMessage);
      socket.close();                          // meter -= 1, trace "disconnect"
    };
  }, [userId]);
  return <MessageList items={messages} />;
}
```

A "Break it" switch removes the `return () => ...` at runtime so the learner drives the leak directly. With cleanup off and StrictMode on, mounting shows the meter jump to 2 and stay there, and the trace shows two `connect` lines with only orphaned emitters. Toggle cleanup on and the same action shows connect, disconnect, connect, settling at **Active connections: 1** with a matched trace.

**Watch:** with no cleanup the meter climbs to 2 under StrictMode and an orphan socket keeps emitting (duplicate messages appear); after you add the symmetric cleanup, the meter settles at 1 and the trace shows a clean connect/disconnect/connect pair. This proves cleanup runs before every re-run and on unmount, and that StrictMode's extra cycle is a test your correct teardown passes.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Add cleanup to a subscription effect so it survives StrictMode mount, unmount, mount and does not orphan the old subscription on a `userId` change. Start from the buggy effect below and return a version that keeps exactly one live connection.

```tsx
useEffect(() => {
  const socket = connect(userId);
  socket.on("message", (m) => setMessages((prev) => [...prev, m]));
}, [userId]);
```

**Think about:**
- When does React run cleanup?
- What is the idempotency/reversibility test for an effect?
- Why does an inline arrow in add/remove leak?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The effect opens a socket and registers a listener but returns nothing, so React has no teardown to run. Corrected:

```tsx
useEffect(() => {
  const socket = connect(userId);
  const onMessage = (m) => setMessages((prev) => [...prev, m]);
  socket.on("message", onMessage);
  return () => {
    socket.off("message", onMessage);
    socket.close();
  };
}, [userId]);
```

Mechanism: React runs the returned cleanup before it re-runs the effect for a new `userId`, and once again on unmount. Without a return, both events are no-ops, so the old socket stays open and its `message` handler keeps calling `setMessages`. Under StrictMode the first mount is setup, cleanup, setup, so a missing cleanup means two sockets open and only one closes. The fix passes the reversibility test: run, tear down, run again leaves exactly one live socket.

The inline-arrow point matters. `socket.on("message", (m) => ...)` and `socket.off("message", (m) => ...)` create two distinct function objects. `off` compares by reference, finds no match, and removes nothing, so even code that "has an off call" leaks. Binding the handler to a named `onMessage` and passing that same reference to both `on` and `off` is what makes removal actually work. `removeEventListener` behaves identically.

How to spot it in review: scan for `addEventListener`, `.on(`, `subscribe(`, `setInterval`, `connect(` inside a `useEffect` and check that the return closes the matching resource by reference. A `useEffect` whose body ends without `return () => ...` around any of those is the tell. Also flag any `if (hasRun.current) return;` guard, which fakes idempotency instead of achieving it.

Production symptom: "my message shows up twice, then three times." Duplicate handlers accumulate as users navigate between conversations, and connection counts creep up until the server rejects new sockets.

Misconception to correct: the StrictMode double invoke is not the bug and removing StrictMode is not the fix. StrictMode surfaces the asymmetry; the real bug is the missing teardown, which still fires in production concurrent remounts.

**Self-check rubric:**
- [ ] Effect returns a cleanup function.
- [ ] Cleanup closes the exact socket opened in that run.
- [ ] The listener is a named reference passed to both `on` and `off`.
- [ ] Switching `userId` leaves one live connection, not two.
- [ ] StrictMode double invoke settles at one connection with a matched trace.
- [ ] No `hasRun`/`didMount` guard is used to suppress the second run.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Presence indicator at scale. Your app shows a green dot when a teammate is online, backed by a `presence.subscribe(teamId, cb)` API that returns an unsubscribe token, plus a `setInterval` heartbeat that pings the server every 5s. Users switch teams from a sidebar dozens of times per session. Write the effect so switching teams never leaves a stale subscription or a zombie heartbeat running, and say what the production incident looks like if you get it wrong.

**Model answer (revealed on demand):**

```tsx
useEffect(() => {
  const token = presence.subscribe(teamId, (online) => setOnline(online));
  const heartbeat = setInterval(() => presence.ping(teamId), 5000);
  return () => {
    presence.unsubscribe(token);
    clearInterval(heartbeat);
  };
}, [teamId]);
```

Two resources open, so cleanup closes two. Each returns something you must capture: `subscribe` returns a token you pass to `unsubscribe`, and `setInterval` returns an id you pass to `clearInterval`. React tears both down before re-running on a new `teamId` and again on unmount, so exactly one subscription and one heartbeat exist at any moment.

The interval is the trap here. If you clear the subscription but forget `clearInterval`, every team switch leaves a heartbeat firing forever against the old `teamId`, each closing over stale state. After 30 switches you have 30 timers pinging 30 different teams every 5 seconds. This is a slow leak, invisible in a quick manual test and brutal over a long session.

How to spot it in review: any effect that opens more than one resource needs cleanup for each; count the opens and count the closes and make sure they match. A `setInterval` or `setTimeout` with no matching `clear` in the return is the highest-signal miss.

Production symptom: a steadily rising request rate to the presence endpoint that correlates with session length, not user count, plus presence dots that update for teams the user left. On mobile it drains battery. In StrictMode dev you would have caught it: the double invoke would show two heartbeats where one should remain. The fix is not to disable timers or StrictMode; it is symmetric teardown for every resource the effect opens.

### ajr-l6-effect-fetch-race: The effect fetch race (ignore flag / AbortController)

- **id:** `ajr-l6-effect-fetch-race`  ·  **difficulty:** advanced  ·  **est:** 16 min  ·  **demo:** react-demo  ·  **skills:** react, races, abort-controller

#### Learn

When an effect fetches on a dependency change, fast changes fire overlapping requests, and the network does not promise to answer them in order. Click user A, then quickly user B. If A's response is slow and B's is fast, B paints first, then A's late response arrives and overwrites the screen with the wrong user. The URL says B, the page shows A, and nothing threw an error.

The buggy loader:

```tsx
useEffect(() => {
  fetch(`/api/users/${userId}`)
    .then((r) => r.json())
    .then((data) => setUser(data)); // stale response can win
}, [userId]);
```

The problem is that every effect run starts a request, but there is no link between a request and the effect run that started it. When B's effect runs, A's `.then` is still pending in the background and will happily call `setUser(A)` whenever it resolves.

The fix uses the cleanup seam. React pairs each effect run with its own cleanup, and runs that cleanup before the next effect. So each run can flip a flag that its own late `.then` checks:

```tsx
useEffect(() => {
  let ignore = false;
  fetch(`/api/users/${userId}`)
    .then((r) => r.json())
    .then((data) => {
      if (!ignore) setUser(data); // stale run no-ops
    });
  return () => {
    ignore = true;
  };
}, [userId]);
```

When B supersedes A, React runs A's cleanup first, setting A's `ignore = true`. A's response still arrives, but its guard is now closed, so it skips `setUser`. B's run has its own fresh `ignore = false`, so B paints. Each closure captures its own `ignore`, which is why this works.

The flag guards state but does not stop the network. A's request still travels, still downloads, still costs bandwidth and a server round trip. To cancel the actual request, use `AbortController`:

```tsx
useEffect(() => {
  const controller = new AbortController();
  fetch(`/api/users/${userId}`, { signal: controller.signal })
    .then((r) => r.json())
    .then((data) => setUser(data))
    .catch((err) => {
      if (err.name !== "AbortError") throw err; // ignore expected cancels
    });
  return () => controller.abort();
}, [userId]);
```

Now cleanup calls `abort()`, which rejects the in-flight fetch with an `AbortError` you swallow, and the browser can actually cancel the connection.

**Interview nuance:** React 18 removed the "can't perform a state update on an unmounted component" warning. Some engineers read that as "the race is fixed." It is not. That warning was about a memory-leak myth; it never had anything to do with response ordering. Removing it makes the race quieter, not gone. The wrong-user paint still happens; you just lost the noisy hint. A senior signal in an interview is knowing that fetch-in-effect is discouraged in current React precisely because of this class of bug, and that a data library (React Query, RTK Query, or a framework loader) handles request keying, cancellation, and ordering for you.

Recap: pair each effect run with a cleanup that either ignores its own stale response or aborts its own request, because the network does not guarantee ordering and the last response to arrive, not the last one requested, wins the screen.

#### See it live

**Demo (react-demo):** buttons for user A / B / C where A responds in 2000ms and B and C in 100ms, a "buggy" toggle vs "cleanup-guarded," and a network panel showing each request's status.

The widget shows three buttons (A slow, B fast, C fast), a header reading **Showing: <name>**, and a network panel listing each request as a row: `GET /users/A ... pending / done / discarded / aborted`. A mode switch flips between the unguarded effect and the guarded one. The intended interaction is: click A, then immediately click B. The component is built around:

```tsx
function Profile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    let ignore = false;
    fetchUser(userId, controller.signal)      // A: 2000ms, B/C: 100ms
      .then((data) => { if (!ignore) setUser(data); })
      .catch((e) => { if (e.name !== "AbortError") throw e; });
    return () => { ignore = true; controller.abort(); };
  }, [userId]);
  return <Header name={user?.name ?? "loading"} />;
}
```

In buggy mode the `return`, `ignore` guard, and `signal` are stripped at runtime so the learner drives the race directly.

**Watch:** in buggy mode, click A then B and the header flickers to B (fast) then wrong-reverts to A when the 2000ms response lands, and the network panel shows A's row completing and overwriting. In guarded mode the same clicks show A's row marked "aborted" the instant B is clicked, B's row completing, and the header staying on B. This proves the ignore flag discards the stale response while `AbortController` cancels the request itself, and that "last to arrive wins" is what the guard defeats.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Fix a broken profile loader that fetches on `userId` change with no guard, first with an ignore flag then with `AbortController`, and explain why the flag alone still finishes the request. Start from:

```tsx
useEffect(() => {
  fetch(`/api/users/${userId}`)
    .then((r) => r.json())
    .then((data) => setUser(data));
}, [userId]);
```

**Think about:**
- What pairs each effect run with its cleanup?
- What does the ignore flag prevent vs abort?
- Why is fetch-in-effect discouraged now?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

Ignore-flag version:

```tsx
useEffect(() => {
  let ignore = false;
  fetch(`/api/users/${userId}`)
    .then((r) => r.json())
    .then((data) => { if (!ignore) setUser(data); });
  return () => { ignore = true; };
}, [userId]);
```

AbortController version (preferred):

```tsx
useEffect(() => {
  const controller = new AbortController();
  fetch(`/api/users/${userId}`, { signal: controller.signal })
    .then((r) => r.json())
    .then((data) => setUser(data))
    .catch((err) => { if (err.name !== "AbortError") throw err; });
  return () => controller.abort();
}, [userId]);
```

Mechanism: React pairs each effect run with the cleanup it returns, and runs the previous cleanup before the next effect. The ignore flag lives in the effect's closure, so the superseded run's cleanup sets its own `ignore = true`; when that old request finally resolves, its `.then` sees a closed guard and no-ops on `setUser`. The new run has a fresh `ignore = false` and paints normally. This works because each closure captures a separate `ignore`.

Why the flag alone still finishes the request: the flag only gates the state update. The `fetch` promise is already in flight and will still hit the server, download the body, and settle. You have prevented the wrong paint but not the wasted round trip. `AbortController` closes that gap: `controller.abort()` in cleanup rejects the pending fetch with an `AbortError` (which you swallow) and lets the browser cancel the connection, so you save the network work too.

How to spot it in review: any `async` work inside a `useEffect` that ends in `setState` with no `ignore` flag and no `signal`. The absence of a `return () => ...` next to a fetch is the anchor.

Production symptom: a user rapidly switches records and the screen settles on the wrong one. It reproduces on slow connections and under load, exactly when it hurts most, and it is intermittent, so it survives happy-path QA.

Misconception to correct: React 18 dropping the unmount state-update warning did not fix this. That warning was never about response ordering; the race predates it and outlives it. Losing the warning just makes the bug quieter.

**Self-check rubric:**
- [ ] Ignore-flag version flips `ignore` in cleanup and guards `setUser`.
- [ ] Abort version passes `signal` to fetch and calls `abort()` in cleanup.
- [ ] `AbortError` is caught and not rethrown.
- [ ] Answer states the flag stops the paint but not the network request.
- [ ] Answer names response ordering, not unmounting, as the cause.
- [ ] Clicking slow A then fast B leaves the screen on B.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Type-ahead search at scale. A search box fires `GET /search?q=<query>` on every debounced keystroke, and results render in a dropdown. Users type "react", pausing mid-word, so `rea`, `reac`, and `react` can all be in flight at once and responses arrive out of order. Write the effect so the dropdown always shows results for the latest query, cancels superseded requests, and does not flash old results. Then name the production symptom of getting it wrong.

**Model answer (revealed on demand):**

```tsx
useEffect(() => {
  if (!query) { setResults([]); return; }
  const controller = new AbortController();
  fetch(`/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
    .then((r) => r.json())
    .then((data) => setResults(data.hits))
    .catch((err) => { if (err.name !== "AbortError") throw err; });
  return () => controller.abort();
}, [query]);
```

Each keystroke changes `query`, so React runs the previous cleanup, which aborts the older in-flight request, then starts a fresh one for the newer query. Because the superseded fetch rejects with `AbortError` instead of resolving, its `setResults` never runs, so a slow `rea` response can never overwrite a fast `react` response. This is the same race as the profile loader, but at higher frequency: a fast typist can have three or four requests overlapping, and without cancellation the dropdown flickers between stale and fresh result sets.

`AbortController` is the right tool over a bare ignore flag here because search fires constantly. Left uncancelled, every keystroke spawns a request that runs to completion, hammering the search endpoint with work whose results you will discard. Aborting frees server capacity and, on the client, avoids parsing large payloads you are about to throw away.

How to spot it in review: a debounced or per-keystroke fetch whose cleanup does not abort, or that keys results only by array replacement without cancellation. The tell is a `setResults` with no `signal` on the fetch and no abort in the return.

Production symptom: the dropdown shows results for a query the user already finished typing past, or briefly flashes stale matches before correcting. It looks like "search is laggy and jumps around," and it worsens with typing speed and network latency. Interview nuance: in real apps you would reach for a data library or a framework loader that keys and cancels by query for you rather than hand-rolling this in every search box.

### ajr-l6-async-effect-callback: Async function as the effect callback breaks cleanup

- **id:** `ajr-l6-async-effect-callback`  ·  **difficulty:** intermediate  ·  **est:** 12 min  ·  **demo:** js-runnable  ·  **skills:** react, useEffect, async

#### Learn

`useEffect`'s callback may return exactly one thing: a cleanup function, or nothing. React stores that return value and calls it as cleanup before the next run and on unmount. That is the entire contract. An `async` function violates it in a way the compiler will not stop, because an `async` function always returns a Promise, never a function.

The trap:

```tsx
useEffect(async () => {
  const data = await load();
  setData(data);
}, []); // returns a Promise, not a cleanup
```

This looks clean and it "works" in the sense that data loads. But you have handed React a Promise where it expected a cleanup function. React checks: is the return value a function? No, it is a Promise. So it stores no cleanup. There is no teardown seam at all. You cannot ignore a stale response, you cannot abort, you cannot unsubscribe. Every technique from the previous two lessons is now impossible, silently.

The reason is plain JavaScript, not React. Mark any function `async` and its return type becomes `Promise<whatever>`. Even `async () => {}` returns `Promise<void>`. React does not `await` that Promise and would not know what to do with it if it did. It just fails the "is it a function?" check and moves on with no cleanup registered.

The fix keeps the effect callback synchronous and moves the `await` into an inner async function you define and call:

```tsx
useEffect(() => {
  let ignore = false;
  async function run() {
    const data = await load();
    if (!ignore) setData(data);
  }
  run();
  return () => { ignore = true; };
}, []);
```

Now the effect callback itself returns a real cleanup function, so the seam exists again and you can guard against stale responses or abort. The `async` work is contained inside `run`, whose Promise is nobody's cleanup and simply floats. With `AbortController` you would pass a `signal` into `run` and call `controller.abort()` in the return.

**Interview nuance:** the returned Promise is not a "harmless no-op." It is worse than doing nothing, because it looks like you handled cleanup while actually disabling it. A reviewer skimming sees an effect with a body and moves on. The literal `useEffect(async () => ...)` is a high-signal red flag precisely because it compiles, runs, loads data on the happy path, and only fails when a dependency changes fast or the component unmounts mid-flight, which is exactly the case the missing cleanup was supposed to handle. Some teams add an ESLint rule to ban async effect callbacks outright for this reason.

Recap: the effect callback must return a function or nothing; an `async` callback returns a Promise, so React registers no cleanup and every race or leak defense becomes impossible, which is why you wrap the await in an inner async function instead.

#### See it live

**Demo (js-runnable):** logs what an `async` function returns (a Promise) versus what a normal effect callback returns (a function), checked against React's cleanup contract that "cleanup must be a function."

```js
// React's actual check, simplified: it only calls the return value if it is a function.
function registerCleanup(returnValue) {
  const isFunction = typeof returnValue === "function";
  console.log("  returned:", Object.prototype.toString.call(returnValue));
  console.log("  typeof:", typeof returnValue);
  console.log("  React will run it as cleanup?", isFunction);
  return isFunction;
}

function load() {
  return new Promise((resolve) => setTimeout(() => resolve("data"), 50));
}

// A) async effect callback (the bug)
console.log("A) useEffect(async () => { ... })");
const asyncCallback = async () => {
  const data = await load();
  console.log("  [A body ran late] loaded:", data);
};
const aReturn = asyncCallback();
const aHasCleanup = registerCleanup(aReturn);

// B) sync effect callback with inner async run + real cleanup (the fix)
console.log("\nB) useEffect(() => { let ignore=false; run(); return () => {...} })");
const syncCallback = () => {
  let ignore = false;
  (async function run() {
    const data = await load();
    if (!ignore) console.log("  [B body ran late] loaded:", data);
    else console.log("  [B] stale run ignored");
  })();
  return () => { ignore = true; };
};
const bReturn = syncCallback();
const bHasCleanup = registerCleanup(bReturn);

console.log("\nResult:");
console.log("  A cleanup registered:", aHasCleanup, "(no teardown seam)");
console.log("  B cleanup registered:", bHasCleanup, "(can ignore/abort)");

// Prove B's seam works: simulate React tearing down before the response lands.
console.log("\nSimulating fast dep change: React runs B's cleanup now...");
bReturn(); // sets ignore = true, exactly as React would before re-running
```

**Watch:** variant A logs `typeof: object`, `[object Promise]`, and "React will run it as cleanup? false", so no teardown exists. Variant B logs `typeof: function` and "true", and when the simulated cleanup runs before `load` resolves, B prints "stale run ignored" while A's late body still runs unguarded. This proves an `async` callback fills React's cleanup slot with a Promise (which React skips), whereas the sync-callback-plus-inner-async pattern returns a real function that gives you the seam to ignore or abort. Note this is a faithful simulation of React's `typeof returnValue === "function"` check, not React itself running.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Refactor `useEffect(async () => { setData(await load()) }, [])` to a non-async effect with an inner async IIFE plus an ignore/abort cleanup, and say what React thought your returned Promise was.

**Think about:**
- What must the effect callback return?
- What does an async function always return?
- What breaks without a cleanup seam?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

Refactored:

```tsx
useEffect(() => {
  let ignore = false;
  const controller = new AbortController();
  (async () => {
    try {
      const data = await load(controller.signal);
      if (!ignore) setData(data);
    } catch (err) {
      if (err.name !== "AbortError") throw err;
    }
  })();
  return () => {
    ignore = true;
    controller.abort();
  };
}, []);
```

What React thought the returned Promise was: its cleanup function. React's contract is that the effect callback returns either a cleanup function or nothing. It does not `await` the return value; it stores it and, at teardown time, checks `typeof returnValue === "function"`. An `async` function always returns a Promise, so that check is false and React registers no cleanup. Your Promise sits in the cleanup slot doing nothing, and React never calls it.

Mechanism: the effect callback's return value is the cleanup slot. A Promise is an object, not a function, so it is silently dropped as cleanup. Keeping the callback synchronous restores a real function in that slot. The actual `await` moves into an inner async IIFE (or a named `async function run()` you then call) whose own Promise is intentionally unused, so nothing depends on it being cleanup.

What breaks without the seam: everything from the earlier lessons. You cannot flip an ignore flag on the superseded run, so a stale response paints the wrong data. You cannot abort, so requests run to completion. A subscription opened in the async body can never be closed, so it leaks and doubles under StrictMode. The bug hides because the happy path still loads data; it only bites when a dependency changes fast or the component unmounts mid-flight.

How to spot it in review: the literal `useEffect(async () => ...)`. That single token, `async` directly on the effect callback, is the whole tell. Grep for it.

Production symptom: fetch races that paint the wrong record and subscription leaks that cannot be cancelled, all in code that looks like it has a working effect. Misconception to correct: the returned Promise is not a harmless no-op; it actively occupies the cleanup slot and makes teardown impossible while appearing handled.

**Self-check rubric:**
- [ ] The `useEffect` callback is synchronous (no `async` on it).
- [ ] The `await` lives in an inner async function or IIFE that is called.
- [ ] The effect returns a real cleanup function.
- [ ] Cleanup flips `ignore` and/or calls `abort()`.
- [ ] Answer states React treated the returned Promise as (skipped) cleanup.
- [ ] Answer names a concrete break: stale paint, uncancellable request, or leak.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Codebase sweep. You inherit a dashboard with a dozen effects, several written as `useEffect(async () => {...}, [deps])`, some opening WebSocket subscriptions and some fetching. QA reports intermittent "wrong widget data after clicking around fast" and a slowly growing socket count. Write the lint rule or grep you would use to find every offender, then show the single reusable pattern you would migrate each one to, and explain why the async form defeats both the race fix and the leak fix at once.

**Model answer (revealed on demand):**

Find them with a grep or an ESLint ban. The grep: search for `useEffect(async` and `useEffect( async` across the codebase. The durable guard is a lint rule; `eslint-plugin-react-hooks` does not ban async effects by default, so add a `no-restricted-syntax` rule targeting an `AwaitExpression`-bodied arrow passed to `useEffect`, or adopt a community rule that flags async effect callbacks. That turns a one-time sweep into a permanent gate.

Migrate every offender to one pattern:

```tsx
useEffect(() => {
  let ignore = false;
  const controller = new AbortController();
  async function run() {
    try {
      const data = await load(controller.signal);
      if (!ignore) setData(data);
    } catch (err) {
      if (err.name !== "AbortError") throw err;
    }
  }
  run();
  return () => {
    ignore = true;
    controller.abort();
  };
}, [deps]);
```

For the subscription effects, the same shape applies: open the socket synchronously inside the effect, register handlers, and return a cleanup that closes it, keeping any awaited setup inside an inner async function.

Why the async form defeats both fixes at once: both the race defense (ignore flag or abort) and the leak defense (unsubscribe or close) live in the returned cleanup function. An `async` callback returns a Promise, so React registers no cleanup, which means there is no place to flip `ignore`, no place to call `abort()`, and no place to close a socket. One mistake, `async` on the callback, disables all three teardown behaviors simultaneously. That is why "wrong widget data after fast clicks" (a race) and "growing socket count" (a leak) show up together in the same report: they share a single root cause. The production symptom set is exactly what you would expect from a missing cleanup seam, and fixing the async signature restores the seam that makes every other fix possible.

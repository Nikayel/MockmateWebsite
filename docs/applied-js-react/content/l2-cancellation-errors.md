> Module **2.4** (Cancellation & Error Handling) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [2.3](./l2-concurrency-control.md) · Next: [2.5](./l2-debounce-throttle.md)

# L2 · Cancellation & Error Handling

After this module you will catch the async mistakes that silently corrupt UIs and swallow errors: requests that are never cancelled and resolve late over fresh data, `try/catch` blocks that only look protective, floating promises that crash Node or vanish in the browser, and the hand-rolled timer and deferred patterns that modern built-ins now replace. You will be able to look at an async block in review and say exactly which rejection it catches, which request it actually cancels, and where a late resolution will overwrite the screen.

### ajr-l2-abortcontroller-cancel: Cancellation with AbortController

- **id:** `ajr-l2-abortcontroller-cancel`  ·  **difficulty:** intermediate  ·  **est:** 14 min  ·  **demo:** react-demo  ·  **skills:** cancellation, abort-controller, fetch

#### Learn

A typeahead search fires a request on every keystroke. The requests race, and the network does not promise to resolve them in the order you sent them. If you type "re", "rea", "reac", "react", the request for "rea" can resolve after the request for "react" and overwrite the correct results with stale ones. The fix is to cancel the request you no longer care about, and `AbortController` is the built-in that does it.

An `AbortController` owns a `signal`. You pass that signal to `fetch(url, { signal })`. Calling `controller.abort()` rejects the fetch promise with a `DOMException` named `AbortError` and tells the browser to cancel the underlying network work. The pattern in an effect is: create a fresh controller per request, pass its signal, and abort in the cleanup function so that starting a new request tears down the previous one.

```jsx
useEffect(() => {
  const controller = new AbortController();
  fetch(`/api/search?q=${query}`, { signal: controller.signal })
    .then((r) => r.json())
    .then(setResults)
    .catch((e) => {
      if (e.name !== "AbortError") setError(e); // ignore our own aborts
    });
  return () => controller.abort(); // supersede on next keystroke / unmount
}, [query]);
```

Two details separate people who have shipped this from people who have not. First, the `catch` must filter out `AbortError`. When you abort, the fetch rejects, and if your catch toasts every rejection your users see an error every time they type. `AbortError` is a normal, expected outcome of cancellation, not a failure. Second, if you manage the controller manually (outside an effect, for example in an event handler), store it in a ref, not state. Setting state re-renders; you do not need a render when you swap controllers, and a ref gives you a stable place to reach the current controller to abort it.

**Interview nuance:** debounce and abort solve different halves of the problem. Debounce reduces how many requests you send (wait for the user to stop typing). Abort cancels the requests you did send once they are superseded. A good typeahead uses both: debounce to cut request volume, abort to guarantee last-response-wins on the ones that still fire.

**Interview nuance:** the common "ignore flag" pattern (`let ignore = false; ...; return () => { ignore = true }`) only blocks the `setState`. The request still runs to completion on the wire, wasting bandwidth and quota. Abort is strictly stronger because it also cancels the network work.

Recap: pass a fresh `signal` per request, `abort()` in cleanup to supersede, and treat `AbortError` as expected, not an error.

#### See it live

**Demo (react-demo):** a search box where each keystroke aborts the prior request, with a toggle to disable aborting.

The widget renders a text input, a "Cancel superseded requests" checkbox (on by default), and a list of "request bars", one per keystroke. Each bar shows its query text and a status: blue "in-flight", green "resolved", or grey "aborted". To make the race visible, the mock backend resolves shorter queries slower (a stale-first stream), so without aborting an old request lands last. A "Results" panel at the bottom shows whichever response resolved most recently. Type a few fast characters and watch the panel; then untick the box and type again.

```tsx
function SearchBox() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [abortOn, setAbortOn] = useState(true);

  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();
    // mock: shorter query = slower response, so stale can land last
    mockSearch(query, { signal: controller.signal })
      .then(setResults)
      .catch((e) => {
        if (e.name !== "AbortError") setResults(["<error>"]);
      });
    return () => {
      if (abortOn) controller.abort();
    };
  }, [query, abortOn]);

  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <label>
        <input
          type="checkbox"
          checked={abortOn}
          onChange={(e) => setAbortOn(e.target.checked)}
        />
        Cancel superseded requests
      </label>
      <ul>{results.map((r) => <li key={r}>{r}</li>)}</ul>
    </>
  );
}
```

**Watch:** with aborting on, every keystroke bar except the newest turns grey "aborted" and the Results panel only ever shows the latest query. With aborting off, older bars run green to "resolved" and, because the mock resolves stale queries last, you see the Results panel flash back to an old query after the newest one already landed. This proves the race is real and that abort, not the loading state, is what fixes it.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Add an AbortController to a search fetch: pass the signal, abort on the next keystroke, and filter AbortError out of the catch. Start from `useEffect(() => { fetch(\`/api/search?q=${query}\`).then(r => r.json()).then(setResults); }, [query])`.

**Think about:**
- What does `abort()` do to the fetch promise?
- Why store the controller in a ref not state?
- How do debounce and abort differ?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The original effect has no `signal` and no cleanup, so every keystroke leaves a live request running and any of them can resolve last and overwrite the screen. Add a fresh controller per run, pass its signal, abort in cleanup, and filter `AbortError`:

```jsx
useEffect(() => {
  const controller = new AbortController();
  fetch(`/api/search?q=${query}`, { signal: controller.signal })
    .then((r) => r.json())
    .then(setResults)
    .catch((e) => {
      if (e.name !== "AbortError") setError(e);
    });
  return () => controller.abort();
}, [query]);
```

Mechanism: when `query` changes, React runs the previous effect's cleanup before running the new effect. That cleanup calls `controller.abort()`, which rejects the in-flight fetch with a `DOMException` named `AbortError` and signals the browser to cancel the network request. So only the newest request survives, guaranteeing last-response-wins.

How to spot it in review: a `fetch` (or any request) inside an effect whose dependency can change, with no `signal` and no cleanup, is a race waiting to happen. Also flag a `catch` that reports every rejection: after you add abort, that catch will fire on every superseded keystroke and spam the user with errors.

Production symptom: a typeahead or profile view that briefly shows the wrong record, usually irreproducible in dev because your local network is fast and evenly ordered. Under real latency the slower earlier request lands last and the UI flickers to stale data.

Common misconception, corrected: the `ignore` flag does not cancel the request. It only guards the `setState` so a late response is dropped instead of rendered. The request still travels the wire, consuming bandwidth, quota, and rate limits. Store the controller in a ref (not state) when you manage it outside an effect, because swapping controllers should not trigger a render and a ref gives you a stable handle to abort the current one.

**Self-check rubric:**
- [ ] A fresh `AbortController` is created per request (not reused across queries).
- [ ] `signal` is passed to `fetch` and `abort()` is called in cleanup.
- [ ] The `catch` ignores `AbortError` and only reports real failures.
- [ ] The explanation names cleanup-runs-before-next-effect as the mechanism.
- [ ] The answer distinguishes cancelling the request (abort) from dropping the render (ignore flag).

#### Practice: real-world variant (save, then reveal)

**Prompt:** Scale it up. In a "Command palette that fetches previews", a user arrow-keys through 20 results in under a second, and each highlighted item triggers a `GET /preview/:id` that populates a side pane. On slow connections the pane shows a preview that does not match the highlighted row. You already abort per keystroke. Diagnose why previews still mismatch and fix it, given that the preview endpoint is served from a CDN that ignores client aborts for already-started responses.

**Model answer (revealed on demand):**

Abort is necessary but not sufficient here. `controller.abort()` rejects the fetch promise on the client immediately, but a CDN edge that has already begun streaming the response body may finish sending it; more importantly, abort does not protect you against a response that resolved in the tiny window before you aborted. You need a correctness guard in addition to the cancel:

```jsx
useEffect(() => {
  const controller = new AbortController();
  let active = true;
  fetch(`/preview/${highlightedId}`, { signal: controller.signal })
    .then((r) => r.json())
    .then((preview) => {
      // guard: only apply if this is still the highlighted row
      if (active && preview.id === highlightedId) setPane(preview);
    })
    .catch((e) => {
      if (e.name !== "AbortError") setPaneError(e);
    });
  return () => {
    active = false;
    controller.abort();
  };
}, [highlightedId]);
```

Mechanism: two defenses working together. `abort()` cancels the network work where the server honors it (saving bandwidth and quota). The `active` flag plus the `preview.id === highlightedId` identity check guarantee correctness even when a response slips through: a stale preview is dropped because either the effect was already cleaned up or the returned id no longer matches the highlighted row. Abort alone optimizes cost; the identity guard enforces last-response-wins.

How to spot it in review: any place that relies solely on abort for correctness. Ask "what if this response resolved 1ms before abort ran, or the server ignores aborts?" If the answer is "wrong data renders", you need an identity or freshness check on the resolved value, not just a cancel.

Production symptom: fast keyboard navigation on a flaky or CDN-fronted connection shows a preview one or two rows behind the cursor, and it is intermittent because it depends on exact timing.

### ajr-l2-async-error-handling: try/catch boundaries in async code

- **id:** `ajr-l2-async-error-handling`  ·  **difficulty:** intermediate  ·  **est:** 14 min  ·  **demo:** js-runnable  ·  **skills:** error-handling, async, try-catch

#### Learn

`try/catch` around async code protects less than it looks. The rule: a `catch` only sees a rejection that is actually `await`ed inside its `try`. If you call an async function without awaiting it, the rejection escapes the `try` entirely and becomes a floating rejection that surfaces somewhere else, later.

Walk the three cases:

```js
async function doAsync() {
  throw new Error("boom");
}

// A) not awaited: the catch is useless
try {
  doAsync(); // returns a rejecting promise, nobody awaits it
} catch (e) {
  console.log("caught A"); // NEVER runs
}

// B) awaited: the catch works
try {
  await doAsync(); // rejection re-throws here, inside the try
} catch (e) {
  console.log("caught B"); // runs
}

// C) returned: the catch is bypassed
async function wrapper() {
  try {
    return doAsync(); // handed to the caller, not awaited here
  } catch (e) {
    console.log("caught C"); // NEVER runs
  }
}
```

In case A, `doAsync()` synchronously returns a promise. The `try` block finishes normally (no throw happened synchronously), so `catch` never runs. The rejection lands on a promise nobody is watching. In case B, `await` pauses the function and, when the promise rejects, re-throws the error at that exact point inside the `try`, so `catch` sees it. In case C, `return doAsync()` hands the promise to whoever called `wrapper()`. The local `try` completed by returning; the rejection is now the caller's problem, not this catch's. If you want the local catch to handle it, write `return await doAsync()`.

The same "only what you await" rule governs combinators. `Promise.all([...])` rejects as soon as one input rejects, and it gives you exactly one reason, the first rejection. The other failures are lost. `Promise.allSettled([...])` never rejects; it resolves to an array of `{ status, value }` or `{ status, reason }` for every input, so you can inspect all failures.

```js
// Promise.all: one reason, the rest are discarded
try {
  await Promise.all([reject("a"), reject("b"), reject("c")]);
} catch (reason) {
  console.log(reason); // "a" only (whichever rejects first)
}

// Promise.allSettled: every outcome
const settled = await Promise.allSettled([reject("a"), reject("b"), reject("c")]);
// [{status:"rejected",reason:"a"}, {..."b"}, {..."c"}]
```

**Interview nuance:** `return await` is not redundant inside a `try`. Outside a try the extra tick from `return await` is a micro-optimization argument, but inside a `try/catch` it is a correctness decision: `return promise` skips the local catch, `return await promise` routes the rejection through it.

Recap: only `await`ed rejections reach the enclosing `catch`; `return promise` gives the rejection to the caller; use `allSettled` when you need every failure, not just the first.

#### See it live

**Demo (js-runnable):** three rejecting variants, `try{doAsync()}`, `try{await doAsync()}`, `try{return doAsync()}`, plus a `Promise.all` vs `allSettled` comparison, logging CAUGHT or ESCAPED per case.

```js
function reject(label, ms = 10) {
  return new Promise((_, rej) => setTimeout(() => rej(new Error(label)), ms));
}

// A) not awaited: catch cannot see it
async function variantA() {
  try {
    reject("A"); // no await
    return "A: try finished, nothing caught";
  } catch (e) {
    return "A: CAUGHT " + e.message;
  }
}

// B) awaited: catch sees it
async function variantB() {
  try {
    await reject("B");
  } catch (e) {
    return "B: CAUGHT " + e.message;
  }
}

// C) returned (not awaited): catch bypassed, caller must handle
async function variantC() {
  try {
    return reject("C"); // handed to caller
  } catch (e) {
    return "C: CAUGHT " + e.message;
  }
}

(async () => {
  console.log(await variantA()); // ESCAPED (message returns, no catch)
  console.log(await variantB()); // CAUGHT B
  try {
    await variantC(); // rejection surfaces HERE, in the caller
  } catch (e) {
    console.log("C: ESCAPED local catch, CAUGHT by caller: " + e.message);
  }

  // Promise.all vs allSettled
  const all = await Promise.all([reject("x"), reject("y"), reject("z")]).catch(
    (r) => r.message
  );
  console.log("Promise.all surfaced ONE reason:", all);

  const settled = await Promise.allSettled([reject("x"), reject("y"), reject("z")]);
  console.log(
    "allSettled surfaced ALL reasons:",
    settled.map((s) => s.reason.message).join(", ")
  );
})();
```

**Watch:** variant A logs its normal return value (its catch never fired, the rejection escaped), variant B logs "CAUGHT B", and variant C logs that the local catch was bypassed and the caller caught it instead. Then `Promise.all` prints a single reason ("x") while `allSettled` prints all three ("x, y, z"). This proves the catch only protects awaited rejections and that `all` collapses many failures into one.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Label which of `try { doAsync() }`, `try { await doAsync() }`, `try { return doAsync() }` the catch protects, then rewrite a many-error `Promise.all([saveA(), saveB(), saveC()])` as `allSettled` so a batch save reports every failure instead of just the first.

**Think about:**
- What must you do inside the try for the catch to see a rejection?
- Why does `return somePromise` lose the local catch?
- How many reasons does `Promise.all` surface?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

Labels: `try { doAsync() }` is NOT protected (the promise is never awaited, so the try finishes normally and the rejection floats away). `try { await doAsync() }` IS protected (await re-throws the rejection inside the try). `try { return doAsync() }` is NOT protected locally (the promise is returned to the caller before it settles, so the caller's catch, not this one, sees it). To protect the third case locally, write `return await doAsync()`.

Batch save rewrite:

```js
const results = await Promise.allSettled([saveA(), saveB(), saveC()]);
const failures = results
  .map((r, i) => ({ r, i }))
  .filter(({ r }) => r.status === "rejected");

if (failures.length) {
  failures.forEach(({ r, i }) =>
    logger.error(`save ${i} failed`, r.reason)
  );
  throw new AggregateError(
    failures.map(({ r }) => r.reason),
    `${failures.length} of 3 saves failed`
  );
}
```

Mechanism: `await` is the only thing that turns a promise rejection back into a synchronous throw at a specific point in the current function, which is what a surrounding `try` needs to catch it. `return promise` completes the function by handing off the still-pending promise; the function's own `try` has already exited. `Promise.all` rejects on the first rejection and surfaces exactly one reason, discarding the rest, which is wrong for a batch where you need to know every item that failed. `allSettled` waits for all of them and reports each outcome, so you can log all failures and decide what to do.

How to spot it in review: an async call sitting inside a `try` with no `await` in front of it, written as if the catch protects it. Also flag `Promise.all` used for independent side-effect operations (saves, sends, uploads) where you actually need per-item outcomes.

Production symptom: a "save all" that reports success while some rows silently failed, or an error that surfaces in a global handler far from the code that caused it because it escaped a try that looked airtight.

Common misconception, corrected: a `try/catch` around a non-awaited call does not catch its rejection. The catch only guards synchronous throws and awaited rejections within the block. No `await` means no local catch.

**Self-check rubric:**
- [ ] Correctly labels the three variants (only the awaited one is locally protected).
- [ ] Notes `return await` as the fix for the returned case.
- [ ] Replaces `Promise.all` with `allSettled` and inspects every result.
- [ ] Explains that `Promise.all` surfaces exactly one reason.
- [ ] Names a concrete production symptom (silent partial failure or far-away error).

#### Practice: real-world variant (save, then reveal)

**Prompt:** Predict and fix a "checkout fan-out" bug. An order handler runs `await Promise.all([chargeCard(), reserveInventory(), sendReceiptEmail()])`. In production, when the email service is down, the whole checkout 500s even though the card was charged and inventory reserved. Rewrite it so a failed email does not fail the order, while a failed charge does, and explain the boundary.

**Model answer (revealed on demand):**

The bug is treating three operations of different criticality as one atomic `all`. `Promise.all` rejects on the first rejection, so a down email service rejects the whole expression and the handler 500s, even though the charge and reservation succeeded. The order is actually complete; only a non-critical side effect failed. Split by criticality:

```js
// critical path: must succeed, failure should abort the order
const [charge, reservation] = await Promise.all([
  chargeCard(order),
  reserveInventory(order),
]);

// non-critical side effect: log failure, do not fail the order
sendReceiptEmail(order).catch((e) =>
  logger.warn("receipt email failed, order still valid", e)
);

return { charge, reservation, status: "confirmed" };
```

Mechanism: `Promise.all` couples the fate of every input, which is correct only when all of them are required for success. Payment and inventory are required, so keeping them in `all` is right: if either fails, the order should not confirm. The receipt email is a best-effort side effect, so it must not be in the same `all`. Detaching it with `.catch` (a deliberate fire-and-forget) lets it fail independently and be logged without taking down checkout. If you later needed a full report of which side effects failed, `allSettled` over the non-critical group would give you every reason.

How to spot it in review: a `Promise.all` mixing must-succeed operations with best-effort ones. Ask of each input "should this failing fail the whole operation?" If the answer differs across inputs, they do not belong in the same `all`.

Production symptom: a downstream, non-essential dependency (email, analytics, cache warmup) taking down a critical user flow, and support tickets from users who were charged but got a checkout error.

### ajr-l2-floating-promise-unhandled: Floating promises and unhandled rejections

- **id:** `ajr-l2-floating-promise-unhandled`  ·  **difficulty:** intermediate  ·  **est:** 12 min  ·  **demo:** js-runnable  ·  **skills:** error-handling, floating-promises

#### Learn

A "floating promise" is an async call whose result you neither `await`, `return`, nor attach `.catch` to. It runs, and if it rejects, the rejection has nowhere to go. Where it surfaces depends on the runtime, and both outcomes are bad.

```js
async function saveAnalytics() {
  throw new Error("network down");
}

saveAnalytics(); // floating: rejection escapes into the void
```

In the browser, an unhandled rejection fires the global `unhandledrejection` event and logs `Uncaught (in promise) Error: network down` to the console. Your `try/catch` around the call site never sees it (there was no await), so from your code's perspective the error silently vanished. In Node, the default behavior since Node 15 is to treat an unhandled rejection like an uncaught exception: it prints the error and crashes the process with a non-zero exit code. So the same floating promise is a silent swallow in one runtime and a hard crash in the other.

The fix depends on intent. If you actually need the result, `await` it (or `return` it) so failures propagate normally. If the call is genuinely fire-and-forget (analytics, telemetry, a non-critical log), you must still attach a `.catch` so the rejection is handled, and you should mark the deliberate non-await with `void` so readers and linters know it was intentional:

```js
// intentional fire-and-forget, failure handled and marked deliberate
void saveAnalytics().catch(reportError);
```

The `void` operator evaluates the expression and returns `undefined`. It does nothing at runtime here except document intent, but that is exactly what the TypeScript ESLint rule `@typescript-eslint/no-floating-promises` wants: it flags any async call whose promise is not awaited, returned, or handled, and it accepts a leading `void` (with a handler) as the sanctioned way to say "I meant to not await this". The rule is your automated defense against this entire class of bug.

**Interview nuance:** a global `unhandledrejection` listener (browser) or `process.on("unhandledRejection")` (Node) is a last-resort safety net for reporting, not a substitute for handling. It fires after the fact, without the local context that caused the error, and in modern Node the process may already be on its way down.

**Interview nuance:** `catch` on a promise is not the same as a `try/catch`. `promise.catch(fn)` attaches a rejection handler to that specific promise, which is what a floating call needs. A surrounding `try/catch` only helps if you `await`.

Recap: never leave an async call floating; `await`/`return` it if you need the result, or `void thing().catch(...)` if it is deliberate fire-and-forget, and let `no-floating-promises` enforce it.

#### See it live

**Demo (js-runnable):** a rejecting promise triggered once without a handler and once with `.catch`, wired to the global `unhandledrejection` event so you can see which one fires it.

```js
// global safety net: fires only for the floating one
if (typeof process !== "undefined" && process.on) {
  process.on("unhandledRejection", (reason) => {
    console.log("GLOBAL unhandledRejection fired:", reason.message);
  });
} else if (typeof addEventListener !== "undefined") {
  addEventListener("unhandledrejection", (e) => {
    console.log("GLOBAL unhandledrejection fired:", e.reason.message);
  });
}

function saveAnalytics(label) {
  return new Promise((_, rej) =>
    setTimeout(() => rej(new Error(label)), 10)
  );
}

// A) floating: no await, no return, no .catch
saveAnalytics("A: floating"); // rejection has nowhere to go

// B) handled fire-and-forget: void marks intent, .catch handles it
void saveAnalytics("B: handled").catch((e) =>
  console.log("LOCAL catch handled:", e.message)
);

// keep the process alive long enough to see the async rejections
setTimeout(() => console.log("done"), 50);
```

**Watch:** variant B logs "LOCAL catch handled: B: handled" and never touches the global handler, because its rejection was handled at the call site. Variant A logs nothing locally, then the global `unhandledRejection` (or browser `unhandledrejection`) handler fires with "A: floating", and in a real Node process without that listener the process would print `Uncaught (in promise)` and exit non-zero. This proves the floating rejection escapes your local code and only resurfaces globally, later, out of context.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Contrast `saveAnalytics()` (fire-and-forget) with `void saveAnalytics().catch(reportError)`: say what surfaces where when each one rejects, and state exactly what the `no-floating-promises` lint rule enforces and how `void` satisfies it.

**Think about:**
- Where does a floating rejection surface?
- What is the Node default on `unhandledRejection`?
- How do you document an intentional fire-and-forget?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

`saveAnalytics()` is a floating promise. When it rejects, nothing at the call site handles it: in the browser it fires the global `unhandledrejection` event and logs `Uncaught (in promise)`, and in Node (since v15) it triggers the default `unhandledRejection` behavior, which prints the error and exits the process with a non-zero code. Either way your surrounding code never learns the analytics save failed. `void saveAnalytics().catch(reportError)` handles the rejection at the call site, so it never reaches the global handler and never crashes Node; `reportError` receives the error with local context.

```js
// bad: floating, crashes Node / silently logs in browser
saveAnalytics();

// good: handled and marked deliberate
void saveAnalytics().catch(reportError);

// also fine when you need the outcome:
await saveAnalytics();
```

Mechanism: not awaiting (and not attaching `.catch`) means the rejection is never claimed by any handler in the current call stack. It escapes the surrounding `try/catch` entirely, because a try only catches synchronous throws and awaited rejections, and it defers to the runtime's global unhandled-rejection path, which fires later and detached from your code. Attaching `.catch` claims the rejection on that specific promise, so it is handled synchronously at the call site.

The `@typescript-eslint/no-floating-promises` rule enforces that every promise-returning call is either awaited, returned, or has a rejection handler (`.catch` or a `.then` with a reject handler). A leading `void` operator plus a handler is the rule's sanctioned way to mark a deliberate fire-and-forget: `void` evaluates and discards the result so the intent is explicit, and the `.catch` satisfies the "must be handled" requirement.

How to spot it in review: an async call on its own line with no `await`, no `return`, and no `.catch`. That single-line shape is the tell.

Production symptom: swallowed errors in the browser (a feature quietly fails to persist and nobody notices until users report lost data) and, in Node, an entire service crashing because one un-awaited background task rejected.

Common misconception, corrected: fire-and-forget promises are not harmless. "I don't care about the result" is not the same as "I don't care about the rejection". You must still handle the rejection, or it becomes a global unhandled rejection.

**Self-check rubric:**
- [ ] States that a floating rejection surfaces globally (`unhandledrejection` / `process` handler), not at the call site.
- [ ] Gives the Node default: unhandled rejection crashes the process (non-zero exit).
- [ ] Uses `void thing().catch(...)` to mark and handle deliberate fire-and-forget.
- [ ] Describes what `no-floating-promises` requires (await, return, or handle).
- [ ] Corrects the "fire-and-forget is harmless" misconception.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Debug an "intermittent pod restarts" incident. A Node API's request handler does `logRequest(req)` (an async call that writes to an external log store) without awaiting it, to keep latency low. Under load the service restarts several times an hour with no obvious cause. Explain the mechanism and fix it without adding latency to the response.

**Model answer (revealed on demand):**

`logRequest(req)` is a floating promise. Normally it resolves and nobody notices. But when the log store has a blip (a timeout or connection reset under load), that call rejects, and because it is neither awaited nor caught, it becomes an unhandled rejection. On modern Node the default `unhandledRejection` behavior terminates the process, so a transient logging failure restarts your pod. The restarts correlate with log-store load, not request load, which is why they look causeless. Fix by handling the rejection while keeping the call non-blocking:

```js
// keep it non-blocking, but handle the rejection
void logRequest(req).catch((e) => metrics.increment("log_write_failed", { err: e.code }));
```

Mechanism: you still do not `await`, so the response latency is unchanged; the handler returns while the log write is in flight. The difference is the attached `.catch`, which claims any rejection on that promise so it never reaches the global unhandled-rejection path and never crashes the process. A transient log failure is now a metric increment instead of a pod restart. As a belt-and-suspenders layer, add a `process.on("unhandledRejection")` reporter so any future floating promise is at least logged, but treat that as a safety net, not the fix.

How to spot it in review: any async I/O call (logging, metrics, cache writes, webhooks) started to "keep latency low" without a `.catch`. The whole point of those calls is that you do not await them, which is exactly why they must carry their own rejection handler.

Production symptom: a service that restarts or crashes intermittently in correlation with the health of a non-critical dependency, with stack traces pointing at a bare async call and no obvious caller fault.

### ajr-l2-modern-async-primitives: Modern Async Primitives: AbortSignal.timeout/any, Promise.withResolvers, Array.fromAsync

- **id:** `ajr-l2-modern-async-primitives`  ·  **difficulty:** intermediate  ·  **est:** 14 min  ·  **demo:** js-runnable  ·  **skills:** cancellation, abort-signal, async

#### Learn

A cluster of newer built-ins replaces patterns that people hand-rolled for years, usually with subtle bugs. Learn the four and you delete a lot of fragile boilerplate.

`AbortSignal.timeout(ms)` returns a signal that auto-aborts after `ms` with a `TimeoutError` reason. It replaces the classic dance of a manual controller plus a `setTimeout` you have to remember to `clearTimeout`:

```js
// old: manual timer you must clear, and it leaks if you forget
const c = new AbortController();
const t = setTimeout(() => c.abort(), 5000);
fetch(url, { signal: c.signal }).finally(() => clearTimeout(t));

// new: no timer to manage, GC-friendly
fetch(url, { signal: AbortSignal.timeout(5000) });
```

`AbortSignal.any([...signals])` returns a composite signal that aborts as soon as any input signal aborts, forwarding that input's reason. This is how you combine a user-cancel with a timeout so either can stop the request, and because the reason is forwarded, `signal.reason.name` tells you which source won ("TimeoutError" vs "AbortError"):

```js
const user = new AbortController();
const signal = AbortSignal.any([user.signal, AbortSignal.timeout(5000)]);
fetch(url, { signal }); // aborts on user cancel OR after 5s, whichever first
```

`Promise.withResolvers()` returns `{ promise, resolve, reject }` in one call. It replaces the "deferred" pattern where you leaked `resolve` out of the executor:

```js
// old: leak resolve/reject out of the executor
let resolve, reject;
const p = new Promise((res, rej) => { resolve = res; reject = rej; });

// new: one call
const { promise, resolve, reject } = Promise.withResolvers();
```

This is exactly the shape you want for event-driven resolution: create the promise now, resolve it later from an event handler, a socket message, or a user action.

`Array.fromAsync(asyncIterable)` drains an async iterator, awaiting each value, into an array. It is the async counterpart to `Array.from`, which does not await promises or consume async iterables:

```js
async function* pages() { yield 1; yield 2; yield 3; }
const all = await Array.fromAsync(pages()); // [1, 2, 3]
// Array.from(pages()) would NOT work: it does not await the async iterator
```

**Interview nuance:** `AbortSignal.any` is not `Promise.race`. `Promise.race` settles a promise with the first value or rejection; `AbortSignal.any` produces a composite abort signal you feed into cancellable APIs, and it forwards the winning source's reason. Different tools: one resolves values, one composes cancellation.

**Interview nuance:** `AbortSignal.timeout` does not leave a timer for you to clear. The timer is managed by the platform and is garbage-collected with the signal, which is the whole point over the manual `setTimeout` version.

Recap: `AbortSignal.timeout(ms)` for self-clearing timeouts, `AbortSignal.any([...])` to compose cancellation sources and learn which won via `reason`, `Promise.withResolvers()` for external resolve/reject, and `Array.fromAsync` to collect async iterables.

#### See it live

**Demo (js-runnable):** a fetch guarded by `AbortSignal.timeout(ms)` that aborts when the timeout fires, then a second run using `AbortSignal.any([userSignal, AbortSignal.timeout(ms)])` racing a user-cancel against a timeout and naming the winner.

```js
// mock fetch that respects an AbortSignal and takes `ms` to "respond"
function mockFetch(ms, { signal }) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const id = setTimeout(() => resolve("response"), ms);
    signal.addEventListener("abort", () => {
      clearTimeout(id);
      reject(signal.reason); // reason carries the winning source
    });
  });
}

(async () => {
  // A) timeout wins: request takes 200ms, timeout is 50ms
  try {
    await mockFetch(200, { signal: AbortSignal.timeout(50) });
    console.log("A) resolved");
  } catch (e) {
    console.log(`A) aborted by: ${e.name}`); // TimeoutError
  }

  // B) compose user-cancel with a timeout, user cancels first
  const user = new AbortController();
  const combined = AbortSignal.any([user.signal, AbortSignal.timeout(500)]);
  setTimeout(() => user.abort(new DOMException("user cancelled", "AbortError")), 30);
  try {
    await mockFetch(200, { signal: combined });
    console.log("B) resolved");
  } catch (e) {
    console.log(`B) winner: ${e.name}`); // AbortError (user beat the 500ms timeout)
  }
})();
```

**Watch:** run A aborts after ~50ms and logs `A) aborted by: TimeoutError`, proving `AbortSignal.timeout` fires on its own with a `TimeoutError` reason and no manual timer. Run B combines a user-cancel with a 500ms timeout; the user aborts at ~30ms, so the composite signal aborts and logs `B) winner: AbortError`, proving `AbortSignal.any` forwards the winning source's reason so you can tell user-cancel from timeout. This is real runnable behavior in any runtime with these built-ins (Node 18+/modern browsers); the mock stands in only for the network.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Replace `const c = new AbortController(); const t = setTimeout(() => c.abort(), 5000); fetch(url, { signal: c.signal }).finally(() => clearTimeout(t))` with `AbortSignal.timeout(5000)`, then combine it with a user-cancel signal using `AbortSignal.any` so either source aborts the fetch, and show how to report which source won.

**Think about:**
- What wiring does `AbortSignal.timeout(ms)` free you from doing by hand?
- When an `AbortSignal.any` signal aborts, how do you tell which source signal won?
- Why did people reach for the deferred pattern before `Promise.withResolvers`?
- What does `Array.fromAsync` do that a for-await loop plus push does not?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

Replace the manual controller-plus-timer with `AbortSignal.timeout`, then compose it with the user-cancel controller via `AbortSignal.any`:

```js
const user = new AbortController(); // wire user.abort() to a Cancel button

const signal = AbortSignal.any([
  user.signal,
  AbortSignal.timeout(5000),
]);

try {
  const res = await fetch(url, { signal });
  return await res.json();
} catch (e) {
  if (e.name === "TimeoutError") showToast("Request timed out");
  else if (e.name === "AbortError") {/* user cancelled, stay quiet */}
  else throw e;
}
```

Mechanism: `AbortSignal.timeout(5000)` returns a signal that auto-aborts after 5s with a `TimeoutError` reason, so there is no `setTimeout` to create and no `clearTimeout` to remember in a `finally`; the platform manages and garbage-collects the timer with the signal. `AbortSignal.any([...])` returns a composite signal that aborts the instant any input aborts and forwards that input's reason. Because the reason is forwarded, `signal.reason.name` (surfaced as the caught error's `name`) is `TimeoutError` when the timeout won and `AbortError` when the user won, so you can react differently: a timeout deserves a toast, a user-cancel should stay silent.

How to spot it in review: a hand-rolled `new AbortController()` paired with a `setTimeout(() => c.abort(), ms)` and a `clearTimeout` in `finally`. That is the exact shape `AbortSignal.timeout` deletes. Also flag a manual deferred (a `let resolve` assigned inside a `new Promise` executor) as a candidate for `Promise.withResolvers`, and a `for await` loop whose only body is `arr.push(x)` as a candidate for `Array.fromAsync`.

Production symptom of the old patterns: leaked timers when the fetch settles before the timeout and nobody clears it, aborts that cannot distinguish a timeout from a user-cancel (so you toast the user for cancelling), and `resolve`/`reject` references leaking out of a Promise executor into surrounding scope where they can be called twice or from the wrong place.

Common misconception, corrected: `AbortSignal.timeout` does not leave a timer you must clear; it is managed and GC-friendly. And `AbortSignal.any` is not `Promise.race`: race settles a promise with a value or rejection, while `any` produces a composite abort signal (with a forwarded reason) that you feed into cancellable APIs.

**Self-check rubric:**
- [ ] Replaces the manual controller+setTimeout+clearTimeout with `AbortSignal.timeout(5000)`.
- [ ] Composes user-cancel and timeout with `AbortSignal.any([...])`.
- [ ] Reads `error.name` (`TimeoutError` vs `AbortError`) to report the winning source.
- [ ] States that `AbortSignal.timeout`'s timer is managed and needs no `clearTimeout`.
- [ ] Distinguishes `AbortSignal.any` (composite signal) from `Promise.race` (settled value).

#### Practice: real-world variant (save, then reveal)

**Prompt:** Build a "wait for a WebSocket ack with a deadline" helper for a trading UI. A `placeOrder(order)` sends over a socket and must resolve when the matching `ack` message arrives, reject if the user hits Cancel, and reject if 3 seconds pass with no ack. Implement it using `Promise.withResolvers` and `AbortSignal.any`/`AbortSignal.timeout`, and explain why these primitives fit better than a hand-rolled deferred plus manual timer.

**Model answer (revealed on demand):**

`Promise.withResolvers` gives you a promise you can resolve later from the socket's message handler, and `AbortSignal.any([userSignal, AbortSignal.timeout(3000)])` gives you a single signal that fires on either a user-cancel or the deadline, with a reason that tells you which:

```js
function placeOrder(order, userSignal) {
  const { promise, resolve, reject } = Promise.withResolvers();
  const signal = AbortSignal.any([userSignal, AbortSignal.timeout(3000)]);

  const onMessage = (msg) => {
    if (msg.type === "ack" && msg.orderId === order.id) {
      cleanup();
      resolve(msg);
    }
  };
  const onAbort = () => {
    cleanup();
    reject(signal.reason); // TimeoutError (deadline) or AbortError (user)
  };
  function cleanup() {
    socket.off("message", onMessage);
    signal.removeEventListener("abort", onAbort);
  }

  socket.on("message", onMessage);
  signal.addEventListener("abort", onAbort);
  socket.send(order);
  return promise;
}
```

Mechanism: the deferred shape is exactly what event-driven resolution needs. The ack arrives asynchronously from a message callback, not from a linear await chain, so you need to hand `resolve` to that callback; `Promise.withResolvers` produces `{ promise, resolve, reject }` without the old trick of leaking `resolve` out of a `new Promise` executor (which is error prone and lets `resolve` be captured or called from the wrong scope). `AbortSignal.any` collapses two cancellation sources into one signal and forwards the winning reason, so a single `onAbort` handler distinguishes a timeout (`TimeoutError`, show "order timed out, check status") from a user-cancel (`AbortError`, stay silent). The managed timeout means no `setTimeout`/`clearTimeout` to leak if the ack arrives first.

How to spot it in review: a socket/event helper that assigns `resolve` from inside a `new Promise` executor and tracks a manual timeout id, especially if it forgets to clear the timer or remove listeners on the happy path (a leak). The `cleanup()` that removes both listeners is the part people miss.

Production symptom of the hand-rolled version: leaked timers and message listeners accumulating per order (a slow memory climb under trading volume), and cancel/timeout paths that cannot be told apart so the UI shows the wrong message.

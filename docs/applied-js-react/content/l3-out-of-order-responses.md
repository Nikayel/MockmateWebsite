> Module **3.1** (Last-Response-Wins) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [2.5](./l2-debounce-throttle.md) · Next: [3.2](./l3-double-submit-idempotency.md)

# L3 · Last-Response-Wins

After this module you can catch the whole family of bugs where async work resolves in the wrong order or reads the wrong input: an earlier fetch that lands after a newer one and repaints stale data, superseded requests that keep burning the network, and closures that act on props from a render that is already gone. These are the "works on my machine, flakes in prod" bugs, and this module makes them visible, reproducible, and fixable.

### ajr-l3-last-response-wins: Last-response-wins renders the wrong data

- **id:** `ajr-l3-last-response-wins`  ·  **difficulty:** hard  ·  **est:** 16 min  ·  **demo:** react-demo  ·  **skills:** races, useEffect, fetch

#### Learn

You have a profile card that refetches whenever the selected user changes:

```tsx
function ProfileCard({ id }: { id: number }) {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    fetchUser(id).then(setUser); // one fetch per id change
  }, [id]);
  return <div>{user?.name ?? "Loading..."}</div>;
}
```

This looks correct and passes every calm test. It breaks the moment two requests overlap. Say the user clicks fast: id 1, then id 2, then id 3. Three effects run, three fetches go out. But network latency is not request order. If id 1 is a heavy record (2000ms) and id 3 is cached (200ms), the responses land as 3, then 2, then 1. Each `.then(setUser)` fires when its own promise resolves, and the last one to resolve wins the state. So the card settles on user 1, the record you navigated away from first, even though the UI clearly says you asked for user 3.

The root cause is that a promise created in an old render is never automatically tied to "is this still the render we care about?" JavaScript resolves promises in completion order, and `setState` has no idea one call is stale. Whichever `.then` runs last overwrites everyone.

The fix is a per-effect ignore flag that the cleanup flips before the next effect runs:

```tsx
useEffect(() => {
  let ignore = false;
  fetchUser(id).then((u) => {
    if (!ignore) setUser(u);
  });
  return () => {
    ignore = true;
  };
}, [id]);
```

React runs the cleanup of the previous effect before running the next effect (and on unmount). So when id changes 1 to 2 to 3, the cleanups for the id-1 and id-2 effects set their captured `ignore` to true. Each `.then` closes over its own `ignore` variable, so when the slow id-1 response finally lands, its check sees `ignore === true` and skips the `setUser`. Only the effect that is still current can write state.

**Interview nuance:** this is the canonical answer to "why does React's docs say fetching in an effect needs cleanup?" It is not about memory leaks or setState-after-unmount warnings (React 18+ dropped that warning). It is about correctness under concurrency: stale responses must not win.

**Interview nuance:** a loading spinner does not fix this. The spinner hides the pending state, but the overwrite still happens when the slow response arrives. You can be past the spinner, showing the "right" answer, and then flip to the wrong one seconds later.

Recap: overlapping fetches resolve in completion order, the last `setState` wins regardless of which id is current, and an effect-cleanup ignore flag lets only the still-current effect commit its result.

#### See it live

**Demo (react-demo):** a dropdown that switches userId 1 to 2 to 3 in a fast burst, where id 1 responds in 2000ms and id 3 responds in 200ms, rendered twice side by side: a buggy card and an ignore-flag fixed card.

The widget renders two `ProfileCard` panels fed the same id changes. A control row has a "Switch 1 to 2 to 3 fast" button that programmatically sets the id three times within ~100ms. Each panel shows the currently displayed user name, a small colored dot per in-flight request, and a log line per settled response. In the fixed panel, discarded responses render with a strikethrough badge ("id 1 response, discarded") instead of overwriting the card. A render/response counter badge on each panel increments as responses land.

```tsx
function fetchUser(id: number): Promise<User> {
  const latency = id === 1 ? 2000 : id === 3 ? 200 : 800;
  return new Promise((res) =>
    setTimeout(() => res({ id, name: `User ${id}` }), latency),
  );
}

// Buggy panel: bare .then(setUser)
useEffect(() => {
  fetchUser(id).then(setUser);
}, [id]);

// Fixed panel: ignore flag committed only by the current effect
useEffect(() => {
  let ignore = false;
  fetchUser(id).then((u) => {
    if (ignore) return logDiscarded(u.id); // strikethrough badge
    setUser(u);
  });
  return () => {
    ignore = true;
  };
}, [id]);
```

**Watch:** the buggy card flickers to User 3 (the fast 200ms response) and then, about two seconds later, wrong-flips back to User 1 when the slow response finally lands, even though the dropdown still reads 3. The fixed card also shows User 3 first, but when the id-1 and id-2 responses arrive they render as struck-through "discarded" badges and never touch the card. This proves the bug is response ordering, not a rendering glitch: same fetches, same timing, only the ignore flag differs.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Rewrite `useEffect(() => { fetchUser(id).then(setUser) }, [id])` so the UI always shows the last requested id even when an earlier request resolves later. Give the corrected effect and explain why cleanup is what makes it correct.

**Think about:**
- Is network order the same as request order?
- What does the effect cleanup run before?
- Does the ignore flag stop the request or just the render?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

Corrected effect:

```tsx
useEffect(() => {
  let ignore = false;
  fetchUser(id).then((u) => {
    if (!ignore) setUser(u);
  });
  return () => {
    ignore = true;
  };
}, [id]);
```

Why this works at the mechanism level: each render of the effect creates a fresh `ignore` variable, and the `.then` callback closes over that specific variable. React guarantees it runs the previous effect's cleanup before running the next effect (deps changed) and on unmount. So the sequence for a fast 1 to 2 to 3 is: run effect(1); cleanup(1) sets ignore1=true and run effect(2); cleanup(2) sets ignore2=true and run effect(3). When the slow `fetchUser(1)` promise finally resolves, its callback checks ignore1, sees true, and skips `setUser`. Only effect(3), whose cleanup has not run, still has `ignore === false`, so only its result commits. The core insight: promises resolve in completion order and the last `setState` wins by default, so you need an explicit "am I still current?" gate, and cleanup is that gate.

How to spot it in review: any `.then(setState)` (or `await` then `setState`) inside a `useEffect` with a changing dependency and no cleanup or abort. The tell is a bare `.then(setSomething)` with a dep array that is not `[]`.

Production symptom: a typeahead result list or profile panel that briefly shows the wrong record, usually only for users on slower connections or slower endpoints, and nearly impossible to reproduce locally because your dev latency is uniform. Bug reports say "it showed someone else's data for a second."

Common misconception to correct: "adding a loading spinner fixes it." It does not. The spinner only hides the pending state. The stale overwrite happens after loading finishes, so you can render the correct user and then flip to the wrong one. Ordering is a data-commit problem, not a visual-state problem.

**Self-check rubric:**
- [ ] My fix uses a per-effect flag (or abort), not a component-level or module-level variable.
- [ ] I explained that cleanup runs before the next effect, which is what neuters the stale callback.
- [ ] I stated that the last `setState` wins because promises resolve in completion order.
- [ ] I noted the ignore flag stops the render, not the request.
- [ ] I named a concrete production symptom (wrong record flashes for a moment).

#### Practice: real-world variant (save, then reveal)

**Prompt:** "Search-as-you-type leaderboard." A `<SearchResults query={query} />` component fires `searchApi(query).then(setResults)` in an effect keyed on `query`. Users type quickly, each keystroke fires a request, and the endpoint's latency scales with how many results the term has (rare terms are fast, common prefixes like "a" are slow). Rewrite the effect so the list always matches the latest query, and explain what a debounce does and does not solve here.

**Model answer (revealed on demand):**

```tsx
useEffect(() => {
  let ignore = false;
  searchApi(query).then((rows) => {
    if (!ignore) setResults(rows);
  });
  return () => {
    ignore = true;
  };
}, [query]);
```

Mechanism: same as the base lesson but the latency inversion is nastier. The slow "a" request was fired earliest, so it is the most likely to land last and overwrite the precise results for "amortized". The ignore flag ensures only the effect for the currently rendered `query` commits, so when the stale "a" response returns it is dropped.

What debounce does and does not solve: debounce reduces how many requests you fire by waiting for a typing pause, which cuts load and reduces the number of overlaps. It does not guarantee ordering. Even with a 300ms debounce you can fire "amort" and then "amortized", and if "amort" hits a slower shard it can still resolve last and clobber the newer results. Debounce is a throughput optimization; last-response-wins is a correctness guarantee. You want both: debounce to fire fewer requests, and the ignore flag (or abort) so that whatever does fire cannot commit out of order.

How to spot it in review: a search box where the effect has no cleanup, especially if someone "fixed the spam" with debounce and considered the race closed. Ask them to demo two overlapping requests with inverted latency.

Production symptom: the results list shows matches for a prefix the user already finished typing past, or the count badge disagrees with the visible rows. Support cannot reproduce it because their test terms all return at similar speeds.

### ajr-l3-abort-vs-ignore-flag: AbortController vs the ignore flag

- **id:** `ajr-l3-abort-vs-ignore-flag`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** cancellation, abort-controller, races

#### Learn

The ignore flag from the previous lesson fixes correctness: stale responses no longer overwrite the UI. But it leaves a cost bug in place. The superseded request is still running. The fetch went out on the wire, the server is still building the 2000ms response, bytes still come back, and the browser still parses them. You just throw the result away in the `.then`. For a fast typeahead this means every keystroke opens a connection that runs to completion and is discarded.

`AbortController` fixes the cost by cancelling the request on the wire:

```tsx
useEffect(() => {
  const controller = new AbortController();
  fetchUser(id, { signal: controller.signal })
    .then(setUser)
    .catch((err) => {
      if (err.name === "AbortError") return; // expected, not a real error
      setError(err);
    });
  return () => {
    controller.abort();
  };
}, [id]);
```

When the effect cleanup calls `controller.abort()`, the browser cancels the in-flight fetch and rejects its promise with a `DOMException` whose `name` is `"AbortError"`. That is two things at once: a real network cancel (a TCP reset / stream close, so the server can stop and no more bytes flow) and a promise rejection. Because it is a rejection, it lands in `.catch`, not `.then`, so you no longer even need an ignore flag for the happy path: the aborted request cannot call `setUser` because it never resolves. The current request, whose controller was not aborted, resolves normally.

The one trap: that `AbortError` rejection will hit your error handling. If your `.catch` does `setError(err)` or shows a toast for every rejection, then every superseded request will flash a fake error in the UI. You must special-case it: `if (err.name === "AbortError") return;`. Abort is an expected, self-inflicted cancellation, not a failure.

**Interview nuance:** "ignore flag vs AbortController" is a common follow-up. The crisp answer: the ignore flag prevents the stale render, AbortController also stops the wasted work. Use the ignore flag when you cannot cancel (a non-abortable promise, a shared cache read). Use AbortController when the request is cancelable and the work is expensive or rate-limited. Modern data libraries (React Query, SWR) pass an `AbortSignal` into your fetcher for exactly this reason.

**Interview nuance:** aborting is not just politeness. On a metered or rate-limited API, abandoned-but-completing requests still count against your quota and can trip rate limits during fast typing, which then throttles the request the user actually cares about.

Recap: the ignore flag drops the stale render but the request still finishes; AbortController issues a real wire cancel plus an `AbortError` rejection, and you must swallow that specific error so it never reaches the error UI.

#### See it live

**Demo (react-demo):** a simulated Network panel with animated in-flight bars, comparing the ignore-flag version (all bars run to completion, then grey out) against the AbortController version (superseded bars snap to red "aborted").

The widget shows two stacked "Network" panels. Clicking "Fire 5 fast switches" launches five simulated requests ~80ms apart in each panel. Each request is a horizontal bar that fills left to right over its latency. In the ignore-flag panel, every bar fills to 100% and then turns grey with a "discarded" tag. In the AbortController panel, when a new request starts, the previous bar immediately snaps to red at its current fill with an "aborted" tag, and only the final bar fills to 100% green ("committed"). A counter tallies "bytes transferred" (proportional to bar fill) so the wasted work is quantified.

```tsx
// Simulated abortable request for the demo
function fakeFetch(id: number, signal: AbortSignal): Promise<Result> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => resolve({ id }), latencyFor(id));
    signal.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError")); // snaps bar to red
    });
  });
}

// Superseded run is cancelled in cleanup:
return () => controller.abort();
```

**Watch:** the ignore-flag panel shows all five bars running to 100% (five full-length "bytes transferred" costs) and only the last one marked kept, the other four greyed. The AbortController panel snaps the first four bars to red mid-fill and only the fifth reaches 100% green, and the "bytes transferred" counter is far lower. This proves the ignore flag and abort give the same correct final UI but very different network cost. Note: the demo simulates cancellation with `setTimeout` plus a manual `AbortError` reject rather than a real TCP cancel, so the "bytes transferred" figure is an illustration of the saved work, not a live capture from the network stack.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Start from the ignore-flag version and rewrite it to also cancel the superseded request on the wire with an `AbortController`, handling `AbortError` so it does not surface as a real error. Give the effect and explain what abort adds over the ignore flag.

**Think about:**
- What does the ignore flag NOT do?
- Where do you call `abort()`?
- How do you keep `AbortError` out of the error UI?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

```tsx
useEffect(() => {
  const controller = new AbortController();
  fetchUser(id, { signal: controller.signal })
    .then((u) => setUser(u))
    .catch((err) => {
      if (err.name === "AbortError") return; // expected cancellation
      setError(err);
    });
  return () => {
    controller.abort();
  };
}, [id]);
```

Mechanism: `AbortController` exposes a `signal` you thread into `fetch`. Calling `controller.abort()` in the effect cleanup fires the signal's abort event; the browser tears down the in-flight request (a real network cancel) and rejects the fetch promise with a `DOMException` named `AbortError`. Because the superseded request now rejects instead of resolving, its `.then` never runs, so it cannot commit stale state, and you no longer strictly need a separate ignore flag. The abort adds the thing the ignore flag lacks: it stops the wasted server work and bandwidth, not just the render.

How to spot it in review: a `fetch` inside a re-running effect with no `signal` passed (so it can never be cancelled), or a `.catch` that treats every rejection the same and would therefore turn a normal abort into a visible error toast. Both are review red flags.

Production symptom: without abort, fast typing opens dozens of requests that all run to completion. On a rate-limited or paid API this burns quota and can trip rate limits, which ironically throttles the request the user is actually waiting on. You see it as elevated request counts in your API dashboard that do not match user-visible actions, and intermittent 429s during heavy typing.

Common misconception to correct: "the ignore flag already saves the network work." It does not. The ignore flag only stops the `setState`. The request still travels the full round trip and the server still does the full job. Only `abort()` cancels the actual work.

**Self-check rubric:**
- [ ] I create a new `AbortController` per effect run and pass `signal` into the fetch.
- [ ] I call `abort()` in the cleanup, not somewhere else.
- [ ] I swallow `AbortError` (check `err.name`) so it never reaches the error UI.
- [ ] I explained abort stops the wire work while the ignore flag only stops the render.
- [ ] I named a cost/quota production symptom, not just a correctness one.

#### Practice: real-world variant (save, then reveal)

**Prompt:** "Autocomplete against a metered geocoding API." Your address field calls a paid geocoder on every keystroke. Finance flags that your request count is 6x your active-user count and you are hitting the plan's rate limit during peak hours. The effect already uses an ignore flag so results are correct. Rewrite it to cut the request cost, and explain why the correct-looking UI was still bleeding money.

**Model answer (revealed on demand):**

```tsx
useEffect(() => {
  if (!query) return;
  const controller = new AbortController();
  const t = setTimeout(() => {
    geocode(query, { signal: controller.signal })
      .then(setSuggestions)
      .catch((err) => {
        if (err.name === "AbortError") return;
        setError(err);
      });
  }, 250); // debounce
  return () => {
    clearTimeout(t);
    controller.abort();
  };
}, [query]);
```

Why the correct UI still bled money: the ignore flag made every superseded response harmless to render, so the UI looked perfect and nobody noticed a bug. But each keystroke still fired a full billed request that ran to completion server-side. Correctness and cost are independent axes: the ignore flag fixes the first and does nothing for the second. The fix layers two things. Debounce (the `setTimeout` cleared in cleanup) fires only after a typing pause, collapsing "1600 Amph" keystrokes into one or two requests instead of a dozen. AbortController cancels any request that a newer keystroke supersedes before it finishes, so even the requests that do fire during fast typing get torn down on the wire and stop counting against the meter.

How to spot it in review: a paid or rate-limited endpoint called directly in a per-keystroke effect with no debounce and no `signal`. The dashboard tell is request volume that scales with typing speed rather than with completed searches.

Production symptom: request count and bill that dwarf actual usage, plus 429s during peak that degrade the feature for everyone. After the fix, request volume drops toward one per completed search and the rate-limit trips disappear.

### ajr-l3-stale-closure-fetch: Stale-closure fetch uses the wrong input

- **id:** `ajr-l3-stale-closure-fetch`  ·  **difficulty:** hard  ·  **est:** 14 min  ·  **demo:** react-demo  ·  **skills:** closures, races, useEffectEvent

#### Learn

This bug looks like last-response-wins but is a different animal. Here the wrong value is not a stale response, it is a stale variable captured by a closure. Consider a save handler that first loads something, then saves the current query:

```tsx
const handleSave = useCallback(async () => {
  await api.load();      // takes ~1500ms
  save(query);           // uses query
}, []);                  // BUG: query missing from deps
```

Every render of the component creates fresh functions. This `handleSave` closes over the `query` that existed in the render where the closure was created. With an empty dep array, `useCallback` returns the very first render's `handleSave` forever, so `query` inside it is frozen at its initial value. The user types "xyz", clicks save, and after the 1500ms `await` the code runs `save("abc")` (or whatever the query was when the memoized callback was minted). The input clearly shows "xyz" but the save used "abc".

Even without `useCallback`, the `await` is the danger point. A closure captures the variables from its render at the moment it is created. When you `await`, you suspend, other renders may happen, but when execution resumes it still reads the variables from the render that created this function invocation. So `save(query)` after an `await` uses the `query` from whenever `handleSave` was called, which can be an old render if the callback identity is memoized with wrong deps.

This is different from last-response-wins. In L3.1 the request order was fine, the responses arrived out of order. Here there is only one operation; the input it reads was captured at the wrong time. Last-response-wins is a data-commit ordering problem; stale closure is a variable-capture problem.

Three fixes, and picking the right one matters:

```tsx
// 1) Correct the deps: make the callback reactive to query.
const handleSave = useCallback(async () => {
  await api.load();
  save(query);
}, [query]); // new callback identity whenever query changes

// 2) Ref for latest: read the current value at call time, non-reactive.
const queryRef = useRef(query);
useEffect(() => { queryRef.current = query; }, [query]);
const handleSave = useCallback(async () => {
  await api.load();
  save(queryRef.current); // always the live value
}, []);

// 3) useEffectEvent: non-reactive read that always sees latest props.
const onSave = useEffectEvent(() => save(query));
const handleSave = useCallback(async () => {
  await api.load();
  onSave(); // reads current query, not a dep
}, []);
```

**Interview nuance:** the ref and `useEffectEvent` fixes are the "non-reactive" ones: `handleSave` keeps a stable identity but still reads the latest `query`. That is what you want when the read should not trigger re-subscription or a new callback identity. Correcting the deps is the reactive fix: the callback is a new function whenever `query` changes.

**Interview nuance:** "does the React Compiler fix this?" No. The Compiler auto-memoizes based on the deps it infers from your code, so it actually removes whole classes of missing-dep bugs. But if you hand-wrote a wrong dep array or rely on capturing an intentionally stale value, a wrong-input read is still a correctness bug the memoizer cannot reason away.

Recap: every render mints fresh closures binding that render's props, a wrong dep array freezes an old closure, and after an `await` you read whatever that closure captured, so fix it with correct deps (reactive) or a ref / `useEffectEvent` (non-reactive latest read).

#### See it live

**Demo (react-demo):** an input bound to `query`; a "Save" button that runs a simulated 1500ms async op and then reports the value it saw, rendered as a buggy version next to a fixed version.

The widget shows one text input driving `query`, and two "Save" buttons. Clicking a Save button starts a 1500ms progress bar; while it runs, the learner is prompted to change the input (e.g. from "abc" to "xyz"). When the timer finishes, each panel shows a banner: "saved: <value it used>". A render badge next to each panel shows two numbers live: the value captured by the memoized callback vs the current live `query`, so you watch them diverge.

```tsx
function StaleSaveDemo() {
  const [query, setQuery] = useState("abc");

  // BUGGY: empty deps freeze the first query
  const buggySave = useCallback(async () => {
    await wait(1500);
    report("buggy", query); // stale capture
  }, []);

  // FIXED: ref always holds the live value
  const queryRef = useRef(query);
  useEffect(() => { queryRef.current = query; }, [query]);
  const fixedSave = useCallback(async () => {
    await wait(1500);
    report("fixed", queryRef.current); // live value
  }, []);

  return (/* input + two Save buttons + result banners */);
}
```

**Watch:** click buggy Save, then change the input from "abc" to "xyz" during the 1500ms wait. The buggy banner reports "saved: abc" (the value captured when the frozen callback was created) while the input clearly reads "xyz". The fixed banner, run the same way, reports "saved: xyz". The render badge shows the captured value stuck at "abc" while the live value moves to "xyz", making the divergence concrete. Note: this illustrates a runtime closure-capture bug, not any compile-time transform; the React Compiler mention in Learn is about what auto-memoization does and does not fix and is not shown running here.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Rewrite a `handleSave` that does `await api.load(); save(query)` inside a `useCallback` whose dep array omits `query`, so `save` always uses the current `query`, and say which of your options is the non-reactive fix and when you would pick it.

**Think about:**
- Which render did this closure capture?
- Why is this different from last-response-wins?
- Which fix is non-reactive?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The reactive fix is to correct the deps:

```tsx
const handleSave = useCallback(async () => {
  await api.load();
  save(query);
}, [query]); // new callback identity whenever query changes
```

The non-reactive fixes keep a stable `handleSave` but read the latest value at call time:

```tsx
// ref
const queryRef = useRef(query);
useEffect(() => { queryRef.current = query; }, [query]);
const handleSave = useCallback(async () => {
  await api.load();
  save(queryRef.current);
}, []);

// or useEffectEvent
const onSave = useEffectEvent(() => save(query));
const handleSave = useCallback(async () => {
  await api.load();
  onSave();
}, []);
```

Mechanism: each render creates fresh closures that bind that render's variables. `useCallback([])` caches the first render's `handleSave`, so its `query` is frozen at the initial value. After the `await`, execution resumes in that same stale closure and `save` gets the old `query`. Adding `query` to the deps mints a new callback whenever `query` changes, so the closure that runs always captured the current value. The ref and `useEffectEvent` versions instead keep one stable closure but indirect through a mutable container (`ref.current`) or a React-managed event that always reads the latest props, so the read is non-reactive: it does not change the callback's identity.

Pick the non-reactive fix (ref or `useEffectEvent`) when `handleSave` is passed to memoized children or used as an effect dependency and you do not want its identity to churn every keystroke, but you still need the live value when it fires. `useEffectEvent` is the intended API for "read latest props inside a stable callback"; a ref is the manual equivalent that works today without that hook.

Why this differs from last-response-wins: there is only one operation here and no response race. The wrong value comes from variable capture at closure-creation time, not from responses arriving out of order.

How to spot it in review: a `useCallback`, `useEffect`, or `useMemo` whose dep array omits a variable that is referenced after an `await` or in an async body. The lint rule `react-hooks/exhaustive-deps` flags it; a suppressed or hand-edited dep array around async code is the classic tell.

Production symptom: a save, submit, or apply that runs with a previous filter, user, or page, especially when the action includes an async step before the write. It shows up as "I changed X, hit save, and it saved the old X."

Common misconception to correct: "the React Compiler fixes stale closures." The Compiler auto-memoizes and removes many missing-dep hazards, but it does not license an intentionally wrong dep array; a callback that reads a stale variable is still a correctness bug, and memoization only decides when to recompute, not which value was captured.

**Self-check rubric:**
- [ ] I gave both a reactive fix (add `query` to deps) and a non-reactive fix (ref or `useEffectEvent`).
- [ ] I identified the closure captured an earlier render's `query`.
- [ ] I said the non-reactive fix keeps a stable callback identity while reading the latest value.
- [ ] I distinguished this from last-response-wins (capture vs response ordering).
- [ ] I named `exhaustive-deps` as the review/lint signal and a concrete production symptom.

#### Practice: real-world variant (save, then reveal)

**Prompt:** "Bulk action on a filtered table." A data grid has a `selectedFilter` and a `runBulkAction` handler that does `await confirmDialog(); await api.bulkDelete(selectedFilter)`. It is wrapped in `useCallback` with `[]` deps because it is passed to a memoized `<Toolbar>`. QA reports that if a user opens the confirm dialog, changes the filter while it is open, and then confirms, the delete runs against the old filter. Fix it without making `<Toolbar>` re-render on every filter change, and explain the timing.

**Model answer (revealed on demand):**

```tsx
// Read the live filter at action time without changing callback identity.
const filterRef = useRef(selectedFilter);
useEffect(() => { filterRef.current = selectedFilter; }, [selectedFilter]);

const runBulkAction = useCallback(async () => {
  const confirmed = await confirmDialog();
  if (!confirmed) return;
  await api.bulkDelete(filterRef.current); // live filter, not captured one
}, []); // stable identity: Toolbar does not re-render on filter change
```

Or, with the intended hook:

```tsx
const onConfirmedDelete = useEffectEvent(() => api.bulkDelete(selectedFilter));
const runBulkAction = useCallback(async () => {
  if (await confirmDialog()) onConfirmedDelete();
}, []);
```

Timing explanation: `runBulkAction` was memoized with empty deps so `<Toolbar>` never re-renders, but that also froze `selectedFilter` at whatever it was when the callback was first created. The `await confirmDialog()` opens a long suspension window during which the user changes the filter, causing re-renders, but the suspended closure still holds the original filter. When they confirm, `api.bulkDelete` runs on the stale value. This is a stale closure amplified by a human-scale async gap (the open dialog), which makes it far more likely to trigger than a fast fetch. The ref indirection keeps `runBulkAction`'s identity stable (so `<Toolbar>` stays memoized) while `filterRef.current` is updated by an effect on every filter change, so the action reads the filter that is live at confirm time, not at mint time.

How to spot it in review: any destructive or write action wrapped in `useCallback([])` for memoization reasons that references props/state after an `await`, especially across a user-controlled async gap like a dialog or an OAuth redirect. Those long gaps are where stale capture becomes almost guaranteed.

Production symptom: bulk operations, and especially destructive ones, that hit the wrong scope: delete the wrong filter's rows, email the wrong segment, refund the wrong batch. These are high-severity because the async gap makes the divergence easy and the blast radius is large.

## Module summary

You can now catch three distinct time-based correctness bugs and say precisely why each happens: last-response-wins (overlapping fetches commit in completion order, gated by an effect-cleanup ignore flag), ignore-flag vs AbortController (render safety vs actually cancelling the wire work and swallowing `AbortError`), and stale-closure fetch (a closure reading a variable captured at the wrong render, fixed reactively with deps or non-reactively with a ref or `useEffectEvent`). In review, the tells are a bare `.then(setState)` in a re-running effect, a `fetch` with no `signal`, and a dep array that omits a variable used after an `await`.

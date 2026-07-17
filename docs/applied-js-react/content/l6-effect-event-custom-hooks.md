> Module **6.5** (useEffectEvent & Custom Hooks) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [6.4](./l6-refs-timing.md) · Next: [7.1](./l7-waterfalls-n-plus-1.md)

# L6 · useEffectEvent & Custom Hooks

Effects have two kinds of values inside them: the ones that should re-trigger the synchronization and the ones you only want to read at their freshest. After this module you will read an effect and instantly tell reactive deps from latest reads, reach for `useEffectEvent` instead of a latest-ref shim, and extract reused effect logic into a named custom hook without leaking stale-closure or identity bugs onto every caller.

---

### ajr-l6-useeffectevent: useEffectEvent: separate reactive deps from latest reads

- **id:** `ajr-l6-useeffectevent`  ·  **difficulty:** hard  ·  **est:** 14 min  ·  **demo:** react-demo  ·  **skills:** react, useEffectEvent, deps

#### Learn

An effect keeps an external system in sync with reactive state, and its dependency array must list every reactive value it reads (6.1). But real effects mix two intents. Some values, like `roomId`, are *reactive*: when they change, the synchronization is stale and must be redone (disconnect, reconnect). Others are read only to grab their *latest* value at the moment something happens, and changing them should not restart the effect at all. The classic collision:

```jsx
function ChatRoom({ roomId, theme }) {
  useEffect(() => {
    const conn = connect(serverUrl, roomId);
    conn.on("connected", () => showToast("Connected!", theme));
    return () => conn.disconnect();
  }, [roomId, theme]); // theme here forces a needless reconnect on every theme flip
}
```

Exhaustive-deps is right that the effect reads `theme`, so you list it. Now flip the theme from light to dark and the effect re-runs: it disconnects the socket and reconnects it, purely to change a toast color. Drop `theme` from the array to stop the reconnect and the linter is right again: the toast will fire with a *stale* theme captured from the render that last reconnected. You are stuck choosing between over-firing reconnections and a stale read. The old escape hatch was a latest-ref shim (`themeRef.current = theme`, read `themeRef.current` in the handler), which works but is boilerplate that hides intent from the linter.

React 19's `useEffectEvent` names this exact split. An Effect Event is a non-reactive function extracted out of the effect. It always reads the current props and state when it is called, and it is deliberately excluded from the dependency array.

```jsx
function ChatRoom({ roomId, theme }) {
  const onConnected = useEffectEvent(() => {
    showToast("Connected!", theme); // always the CURRENT theme
  });

  useEffect(() => {
    const conn = connect(serverUrl, roomId);
    conn.on("connected", () => onConnected());
    return () => conn.disconnect();
  }, [roomId]); // theme is gone; only reactive deps remain
}
```

Now `roomId` is the only reactive dependency, so the socket reconnects on room change and *nothing else*. The toast reads `theme` fresh every time it fires, because `onConnected` is not a captured closure over one render; React guarantees it sees the latest values at call time. You get correct latest reads without over-firing the effect.

Two rules make Effect Events safe. First, you must not list them in deps; that is the whole point, and React (and the linter) treat them as non-reactive. Second, you can only call an Effect Event from inside an Effect, and you must not pass it to other components or hooks as a prop or argument. It is not a general "always fresh" callback; it is a hole cut in one specific effect so a few values can be read non-reactively.

**Interview nuance:** the sharp framing is "reactive values re-synchronize the effect; Effect Events read latest without re-synchronizing." If someone answers "just add theme to deps" or "just remove it and disable the lint," they are choosing one bug over the other. The Effect Event dissolves the tradeoff instead of picking a side.

Recap: split effect values into reactive (belong in deps, re-run the sync) and latest-read (wrap in `useEffectEvent`, excluded from deps, always read fresh); call the Effect Event only from inside the effect and never pass it around.

#### See it live

**Demo (react-demo):** a chat effect that connects on `roomId` change but calls `onConnected(theme)` with the current theme, while you switch rooms and themes fast and watch which action actually reconnects.

The widget renders a room dropdown (`general` / `random` / `support`), a theme toggle (`light` / `dark`), and a scrolling log of `connect(room)` / `disconnect(room)` / `toast(theme)` lines. A "reconnects: N" counter sits next to the log. A mode switch flips between "theme in deps" (`[roomId, theme]`) and "useEffectEvent" (`[roomId]`), so the learner can A/B the two effects against the exact same clicks.

```tsx
function ChatRoomDemo({ mode, theme, roomId }: {
  mode: "themeInDeps" | "effectEvent";
  theme: "light" | "dark";
  roomId: string;
}) {
  const onConnected = useEffectEvent(() => {
    log(`toast(${theme})`); // reads CURRENT theme, non-reactive
  });

  useEffect(() => {
    log(`connect(${roomId})`);
    if (mode === "themeInDeps") log(`toast(${theme})`); // captured theme
    else onConnected();                                 // latest theme
    return () => log(`disconnect(${roomId})`);
  }, mode === "themeInDeps" ? [roomId, theme] : [roomId]);

  return <RoomStatus roomId={roomId} theme={theme} />;
}
```

**Watch:** in "theme in deps" mode, toggling the theme alone logs `disconnect(general) -> connect(general) -> toast(dark)` and bumps the reconnect counter, proving the socket needlessly tears down just to recolor a toast. In "useEffectEvent" mode, toggling the theme logs nothing and the reconnect counter holds still, while switching rooms logs one `disconnect -> connect -> toast(<current theme>)` and the toast always matches the theme you have selected right now. That contrast, same clicks, different reconnect count, is the whole lesson. This is real React 19 running in the browser, not an approximation.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Rewrite this chat effect so it reconnects only on `roomId` but still toasts the current theme, wrap the toast in `useEffectEvent`, and explain why `theme` no longer belongs in the dependency array. Given `useEffect(() => { const conn = connect(url, roomId); conn.on("connected", () => showToast("Connected!", theme)); return () => conn.disconnect(); }, [roomId, theme])`, produce the corrected code and justify it at the mechanism level.

**Think about:**
- What is reactive vs non-reactive here?
- Why is useEffectEvent excluded from deps?
- What is the rule about where you can call it?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

Reactive here is `roomId`: when it changes the socket is talking to the wrong room and must reconnect. `theme` is non-reactive: it is only read to color a toast, and changing it should not touch the socket. The fix separates them with an Effect Event.

```jsx
function ChatRoom({ roomId, theme }) {
  const onConnected = useEffectEvent(() => {
    showToast("Connected!", theme); // reads the CURRENT theme at call time
  });

  useEffect(() => {
    const conn = connect(serverUrl, roomId);
    conn.on("connected", () => onConnected());
    return () => conn.disconnect();
  }, [roomId]); // only the reactive dependency
}
```

**Why, at the mechanism level.** The dependency array decides when React re-runs the synchronization by `Object.is`-comparing deps each render. With `[roomId, theme]`, a theme flip fails the comparison, so React runs cleanup (`disconnect`) then the effect again (`connect`), reconnecting the socket for no reason. An Effect Event is a non-reactive function: React does not snapshot the variables it closes over at effect-creation time; it wires `onConnected` so that each call reads the latest `theme` from the current render. Because it is guaranteed fresh, it does not need to be a dependency, so it is excluded from the array. That leaves `roomId` as the only reactive dep, so the socket reconnects on room change and nothing else, while the toast is still current.

**How to spot it in review.** Two tells. A latest-ref shim (`const xRef = useRef(x); xRef.current = x;`) whose only job is feeding a fresh value into an effect is a hand-rolled Effect Event; in React 19 replace it. And a value dropped from the deps under an `// eslint-disable-next-line react-hooks/exhaustive-deps` comment is almost always a latest-read that should be an Effect Event, not a silenced bug.

**Production symptom (fixed).** Before: every theme toggle (or locale change, or any incidental prop) reconnects the chat socket, spamming connect/disconnect, dropping in-flight messages, and hammering the realtime backend. After: reconnects happen only on real room changes and the toast still shows the right theme.

**Common misconception, corrected.** "An Effect Event is just a stable callback I can pass to children like `useCallback`." It is not. You may only call it from inside an Effect, and you must not pass it as a prop or into another hook. It is a non-reactive hole in one specific effect, not a general always-fresh function you hand around.

**Self-check rubric:**
- [ ] Identifies `roomId` as reactive and `theme` as a latest-read.
- [ ] Wraps the toast in `useEffectEvent` and lists only `[roomId]` in deps.
- [ ] Explains that an Effect Event reads current props/state at call time, so it is excluded from deps.
- [ ] States the call-site rule: only from inside an effect, never passed to children/hooks.
- [ ] Names the production symptom (needless reconnect churn on incidental prop changes).
- [ ] Rejects both "add theme to deps" and "disable the lint" as choosing one bug over another.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Fix "the analytics page-view double-count." A `<Page>` effect logs a visit: `useEffect(() => { logVisit(url, { plan: user.plan, experiments }); }, [url, user, experiments])`. Product wants exactly one visit logged per URL change, tagged with the user's *current* plan and experiment buckets. But the visit re-fires whenever `user` or `experiments` re-renders (a new object identity, or a plan upgrade mid-session), inflating page-view counts. Rewrite it so the visit fires once per `url` change while still reading the latest plan and experiments, and say why moving those into an Effect Event is correct here.

**Model answer (revealed on demand):**

Only `url` is reactive for this effect: a new URL is a new page view. `user.plan` and `experiments` are latest-reads, tags you want current at log time but that should never *cause* a log. Listing them in deps means every new `user`/`experiments` object identity (a re-render, a plan change, a bucket reshuffle) re-fires `logVisit` on the same URL, double-counting visits.

```jsx
function Page({ url, user, experiments }) {
  const onVisit = useEffectEvent(() => {
    logVisit(url, { plan: user.plan, experiments }); // latest plan + buckets
  });

  useEffect(() => {
    onVisit();
  }, [url]); // one visit per URL change
}
```

**Mechanism.** With `[url, user, experiments]`, React `Object.is`-compares all three each render; `user` and `experiments` are objects, so a fresh identity (common on re-render) fails the check and re-runs the effect, calling `logVisit` again for a URL that never changed. Wrapping the log in `useEffectEvent` makes it non-reactive: it reads `url`, `user.plan`, and `experiments` fresh when called, so they can leave the dependency array. Now only `url` gates the effect, and it fires exactly once per navigation while still tagging the current plan and buckets.

**How to spot it in review.** An analytics/telemetry effect whose deps include whole objects (`user`, `session`, `experiments`) alongside the one value that should trigger it. If the deps are "the trigger plus a pile of context I want to attach," the context belongs in an Effect Event.

**Production symptom.** Inflated, unreliable page-view and funnel metrics: dashboards over-count visits, conversion rates look wrong, and A/B readouts are polluted because a mid-session plan upgrade or a re-render re-logged the same page.

**Misconception, corrected.** "Deps must include everything the effect reads, so `user` and `experiments` have to be listed." Exhaustive-deps applies to *reactive* reads. Values read only to capture their latest value are exactly what Effect Events exist for; they are read fresh and correctly excluded from deps.

**Self-check rubric:**
- [ ] Identifies `url` as the only reactive trigger; plan and experiments as latest-reads.
- [ ] Moves the log into `useEffectEvent` and lists only `[url]`.
- [ ] Explains the object-identity re-fire via `Object.is` on `user`/`experiments`.
- [ ] Names the metrics symptom (inflated page-views / polluted A/B data).
- [ ] Corrects "deps must list everything read" to "deps list reactive reads."

---

### ajr-l6-custom-hooks-encapsulate: Custom hooks: encapsulate nuance without leaking bugs

- **id:** `ajr-l6-custom-hooks-encapsulate`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** react, custom-hooks, deps

#### Learn

A custom hook is just a function whose name starts with `use` and that calls other hooks. It is not a shared store and not a singleton. Each *call site* runs the hook body independently, so each component that calls `useChatRoom(roomId)` gets its own state, its own effect, and its own cleanup. Extracting logic into a custom hook shares the *code*, never the *state*. That is the first thing people get wrong, and the second is assuming extraction relaxes the rules that applied to the raw effect. It does not.

Say two components both connect to a chat room. You lift the effect into a hook:

```jsx
function useChatRoom(roomId) {
  const [status, setStatus] = useState("connecting");

  useEffect(() => {
    const conn = connect(serverUrl, roomId);
    conn.on("open", () => setStatus("online"));
    return () => conn.disconnect();
  }, [roomId]); // still exhaustive: roomId is a reactive read

  const send = useCallback((msg) => post(roomId, msg), [roomId]); // stable identity

  return { status, send };
}
```

Two things carry over from the raw-effect lessons. Exhaustive-deps still applies *inside* the hook: `roomId` is read, so it is listed, and if you suppress the linter here you have merely hidden the desync inside a nicer name. Reactive inputs the hook depends on must be passed in as arguments (here `roomId`) so React can react to them, exactly as if the effect were still inline.

The new obligation is identity. A hook that returns values is a producer of props for its callers. If it returns a fresh object or function every render, every consumer that puts those in deps or passes them to a memoized child will thrash. So `send` is wrapped in `useCallback` and only changes identity when `roomId` changes. If you returned `{ status, send: (msg) => post(roomId, msg) }` with an inline arrow, a memoized child taking `send` would re-render on every parent render (5.2), and the leak would be invisible because it lives one level down in "shared" code.

**Interview nuance:** the leverage-and-risk framing wins here. A custom hook multiplies both. A good abstraction (exhaustive deps, stable returns, reactive inputs as args) fixes a class of bugs everywhere at once. A sloppy one (suppressed linter, inline object/function returns) *ships the same bug to every consumer* and is harder to spot because it is buried behind a clean call site. "It is in a hook now" is not a correctness argument.

Recap: a custom hook shares logic, not state (each caller is isolated); keep deps exhaustive inside it, take reactive values as arguments, and return stable identities (`useCallback`/`useMemo`) so consumers do not re-render or re-run effects; a bug hidden in a hook hits every call site.

#### See it live

**Demo (react-demo):** two components sharing one `useChatRoom` hook, a global input they both read, and a returned-callback identity badge on a memoized child.

The widget renders two `<Chat>` panels side by side, each calling `useChatRoom(roomId)`, plus a shared text input at the top. Each panel shows its own `status` and its own message list (proving state is isolated), a "renders: N" badge, and a memoized `<SendButton onSend={send}>` child with its own "child renders: N" badge and a `send #id` identity readout. A mode switch flips the hook's return between "stable (`useCallback`)" and "inline arrow".

```tsx
function useChatRoom(roomId: string, mode: "stable" | "inline") {
  const [status, setStatus] = useState("connecting");

  useEffect(() => {
    setStatus(`online:${roomId}`);
    return () => {/* disconnect */};
  }, [roomId]); // exhaustive inside the hook

  const stableSend = useCallback((msg: string) => post(roomId, msg), [roomId]);
  const send = mode === "stable" ? stableSend : (msg: string) => post(roomId, msg);

  return { status, send };
}

const SendButton = React.memo(function SendButton({ onSend }: { onSend: (m: string) => void }) {
  return <button onClick={() => onSend("hi")}>send</button>; // "child renders" badge bumps on each render
});
```

**Watch:** type in the shared input and both panels update in lockstep from the same hook logic, yet each keeps its own `status` and message list, proving the hook shares code, not state. In "stable" mode the `send #id` badge holds one value and the memoized `SendButton`'s child-render badge stays flat while the parent re-renders, because `useCallback` preserves identity. Flip to "inline arrow" and the `send #id` changes every render and the child-render badge climbs in step with the parent, because a fresh function defeats `React.memo`'s shallow `Object.is` prop check. Same hook, one changed return, visible thrash. Real React in the browser.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Extract this raw effect-and-state into a named custom hook, keep the deps exhaustive inside it, return stable identities, and confirm consumers do not thrash. Given a component with `const [status, setStatus] = useState(...)`, a `useEffect(() => { const c = connect(url, roomId); ...; return () => c.disconnect(); }, [roomId])`, and an inline `send = (msg) => post(roomId, msg)`, produce `useChatRoom(roomId)` and explain what each rule buys the callers.

**Think about:**
- Do custom hook instances share state?
- Does extraction exempt exhaustive-deps?
- Why return stable identities?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

Name the hook by purpose, pass the reactive input as an argument, keep the internal effect deps exhaustive, and wrap the returned callback so its identity is stable.

```jsx
function useChatRoom(roomId) {
  const [status, setStatus] = useState("connecting");

  useEffect(() => {
    const conn = connect(serverUrl, roomId);
    conn.on("open", () => setStatus("online"));
    return () => conn.disconnect();
  }, [roomId]); // reactive read stays in deps

  const send = useCallback((msg) => post(roomId, msg), [roomId]);

  return { status, send };
}
```

**Mechanism.** A custom hook is a function that calls hooks; React tracks its hook calls per component instance, so every call site gets independent `useState` and `useEffect` slots. Two components calling `useChatRoom` do not share `status` or a socket, they each run the body. Extraction changes nothing about the reactive contract: the effect still reads `roomId`, so `[roomId]` must stay, and suppressing exhaustive-deps here hides the same desync behind a nicer name. `useCallback` gives `send` a stable reference that only changes when `roomId` changes, so consumers that pass `send` to a `React.memo` child or list it in their own deps do not re-render or re-subscribe every render.

**How to spot it in review.** A custom hook that returns an inline object or arrow (`return { data, refetch: () => ... }`) is handing unstable identities to every caller. A custom hook with `// eslint-disable-next-line react-hooks/exhaustive-deps` inside it is shipping a stale-closure bug to every caller. Both are worse than the same mistake inline because the clean call site hides them.

**Production symptom.** A bug or churn in shared hook code multiplies across the app: fix or break `useChatRoom` and every screen using it changes at once. A missing internal dep desyncs every consumer's socket; an unstable return re-renders every memoized child and re-fires every dependent effect app-wide.

**Common misconception, corrected.** "A custom hook is a shared store, so all callers see the same state." No. It shares logic, not state; each call is isolated. If you need shared state across components, that is Context or an external store, not a plain custom hook.

**Self-check rubric:**
- [ ] Names the hook by purpose and passes `roomId` as an argument.
- [ ] Keeps the internal effect deps exhaustive (`[roomId]`), no lint suppression.
- [ ] Returns `send` via `useCallback` (stable identity), not an inline arrow.
- [ ] States that each call site gets independent state/effects (no shared store).
- [ ] Explains stable returns prevent consumer re-renders / effect re-runs.
- [ ] Notes a bug in the hook hits every consumer.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Diagnose "the useFetch that thrashes the whole app." A widely-used `useFetch(url, options)` does `const [data, setData] = useState(null); useEffect(() => { fetch(url, options).then(r => r.json()).then(setData); }, [url, options]); return { data, refetch: () => fetch(url, options).then(...) };`. Callers pass `options={{ headers }}` inline. After it shipped, every screen using it re-fetches on each render and memoized children re-render constantly. Fix the hook and explain why the blast radius is app-wide.

**Model answer (revealed on demand):**

Two identity bugs live inside the shared hook, so every caller inherits both. `options` is an object; callers build `{{ headers }}` inline, a new reference each render, so `[url, options]` fails `Object.is` every render and the effect re-fetches endlessly. And `refetch` is a fresh inline arrow each render, so any consumer passing it to a `React.memo` child re-renders that child every time.

```jsx
function useFetch(url, options) {
  const [data, setData] = useState(null);
  // stabilize the option object by its meaningful contents
  const stableOptions = useMemo(() => options, [JSON.stringify(options)]);

  useEffect(() => {
    let ignore = false;
    fetch(url, stableOptions)
      .then((r) => r.json())
      .then((d) => { if (!ignore) setData(d); });
    return () => { ignore = true; };
  }, [url, stableOptions]);

  const refetch = useCallback(() => {
    fetch(url, stableOptions).then((r) => r.json()).then(setData);
  }, [url, stableOptions]);

  return { data, refetch };
}
```

**Mechanism.** Both `useEffect` deps and `React.memo` props run the same `Object.is` identity check, and an inline object or arrow is a new reference every render, so it defeats both. Stabilizing `options` (memoized on its serialized contents, or better, asking callers to pass a stable object) and wrapping `refetch` in `useCallback` restores stable identities. Because the fix is in one hook, it repairs every screen at once, which is exactly why the *bug* was app-wide: a shared hook broadcasts its identity mistakes to every call site.

**How to spot it in review.** A shared data hook that takes an object/array param and lists it directly in deps, or returns inline functions. Any hook used in more than a couple of places deserves an identity audit, because its mistakes scale with its popularity.

**Production symptom.** A self-inflicted request storm across the app (the shared hook re-fetches on every render on every screen, potentially rate-limiting or DDoS-ing your own API), plus pervasive jank as memoized children re-render everywhere `refetch` is passed down.

**Misconception, corrected.** "It is a reusable hook, so it is safe to drop in anywhere." Reuse amplifies quality in both directions. An unstable return or a missing dep in a popular hook is more dangerous than the same mistake in one component, not less, because it ships everywhere.

**Self-check rubric:**
- [ ] Identifies the inline `options` object as the re-fetch cause via `Object.is`.
- [ ] Stabilizes `options` (memo on contents, or require a stable arg) and lists it in deps.
- [ ] Wraps `refetch` in `useCallback` so memoized children stop thrashing.
- [ ] Explains the app-wide blast radius from a single shared hook.
- [ ] Names the request-storm plus jank production symptoms.

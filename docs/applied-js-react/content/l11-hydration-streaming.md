> Module **11.2** (Hydration & Streaming) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [11.1](./l11-rsc-boundary.md) · Next: [11.3](./l11-concurrency-production.md)

# L11 · Hydration & Streaming

Server-rendered React has two halves that must agree: the HTML the server sent and the tree the client builds on its first pass. This module teaches you to catch the two failures that make that agreement break in production: a component that renders non-deterministic values (time, random, `localStorage`) so the client tree cannot match the server HTML and React throws it all away, and a missing Suspense boundary that makes the entire streamed response wait on its single slowest fetch instead of painting a shell in 50ms.

### ajr-l11-hydration-mismatch: Hydration mismatch from non-deterministic render

- **id:** `ajr-l11-hydration-mismatch`  ·  **difficulty:** hard  ·  **est:** 14 min  ·  **demo:** react-demo  ·  **skills:** react, hydration, ssr

#### Learn

Server-side rendering runs your component once on the server to produce HTML, ships that HTML so the user sees content fast, then runs the same component again on the client. That second client pass is **hydration**: React walks the existing server DOM and attaches event handlers, assuming the tree it computes now matches the tree the server already painted. The load-bearing word is *matches*. Hydration is not a fresh render that replaces the HTML; it is React adopting the server's DOM node by node. If React's client render disagrees with the server HTML at any node, that assumption is violated and React cannot trust the adopted DOM.

The classic way to break it is to render a value that is different on the server than on the client:

```tsx
function Clock() {
  // BAD: runs at server-render time, then again at hydration time.
  return <span>{new Date().toLocaleTimeString()}</span>;
}

function ThemeLabel() {
  // BAD: localStorage does not exist on the server, and its value
  // is unknown until the client runs.
  return <span>{localStorage.getItem("theme") ?? "light"}</span>;
}
```

The server renders `Clock` at, say, `10:00:00` and puts that text in the HTML. Milliseconds later the client hydrates and `new Date()` now says `10:00:01`. The text nodes differ. `ThemeLabel` is worse: `localStorage` is `undefined` on the server so the render either crashes or falls back to `"light"`, while the client reads the real stored `"dark"`. Same violation, same result.

When React (18/19) hits a text mismatch during hydration it logs `Hydration failed because the server rendered HTML didn't match the client` and, for the affected boundary, **discards the server-rendered tree and re-renders it on the client from scratch**. The user sees a flash: the server value paints, then a beat later it is replaced by the client value. You paid for SSR and got a client render anyway, plus a visible flicker and a console error.

The correct fix is to make the **first client render deterministic**, meaning identical to the server. Two patterns:

```tsx
// Two-pass: render a stable placeholder on both server and first client
// render, then fill in the client-only value in an effect (after hydration).
function Clock() {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => { setTime(new Date().toLocaleTimeString()); }, []);
  return <span>{time ?? " "}</span>; // both passes render the placeholder
}
```

```tsx
// Or send the value from the server so both passes agree.
// Server reads the cookie and passes it as a prop; no client guessing.
function ThemeLabel({ theme }: { theme: string }) {
  return <span>{theme}</span>;
}
```

The two-pass version works because `useEffect` runs only on the client, *after* hydration commits. The first client render matches the server (both render the placeholder), hydration succeeds, then the effect swaps in the live value as a normal state update.

**Interview nuance:** `suppressHydrationWarning` is not a fix. It silences the console warning for one element whose content is legitimately client-specific (a timestamp you accept will differ), but React still discards and re-renders that node. It does nothing for **structural** mismatches (different tags, extra or missing elements, reordered children); those corrupt hydration regardless and there is no suppress flag that makes them safe.

**Interview nuance:** the tell in review is any of `new Date()`, `Math.random()`, `Date.now()`, `window`, or `localStorage`/`sessionStorage` referenced directly in a component body that renders on the server. Each is a value the server cannot know or that changes between the two passes.

Recap: hydration is React adopting the server DOM and assumes the first client render equals the server HTML; non-deterministic values (time, random, storage, `window`) break that, so React discards and client-renders the boundary with a visible flash; fix it by rendering a deterministic placeholder and filling the real value in `useEffect`, or by passing the value from the server, and know that `suppressHydrationWarning` hides the warning but never repairs a structural mismatch.

#### See it live

**Demo (react-demo):** the same `Clock`/`ThemeLabel` component rendered in two side-by-side panels, one labeled "server HTML" and one labeled "client render," with a diff highlighter over the text and a "React discarded server HTML" counter.

Two stacked cards. The **left card** ("server HTML") shows a frozen snapshot: `10:00:00` and theme `light`. The **right card** ("client render") shows what the client computes on its first pass: `10:00:01` and theme `dark`. A **diff highlighter** paints the differing text nodes red and draws a connector line between the mismatched pairs. A **"Server HTML discarded: N"** counter sits at the top and increments each time a mismatch is detected. A toggle labeled **"Apply two-pass fix"** switches the component between the broken and fixed versions. The widget is built around:

```tsx
function Clock({ mode }: { mode: "broken" | "fixed" }) {
  const [time, setTime] = useState<string | null>(
    mode === "broken" ? new Date().toLocaleTimeString() : null,
  );
  useEffect(() => {
    if (mode === "fixed") setTime(new Date().toLocaleTimeString());
  }, [mode]);
  // broken: server and client compute different times -> red diff, discard++
  // fixed: both first-render the placeholder -> panels match, discard stays 0
  return <span className="clock">{time ?? " "}</span>;
}
```

**Watch:** with the fix off, the two panels show different text, the mismatched nodes flash red, the connector highlights the pair, and the "Server HTML discarded" counter ticks up by one per mismatched boundary. Flip "Apply two-pass fix" on and both panels render the same blank placeholder, no red, the counter stays at 0, and a beat later the right panel fills in the live time as a post-hydration state update. This is a faithful simulation of the browser hydration path (the demo stages the "server HTML" as a fixed snapshot rather than running a real Node render), and it proves that a first-render mismatch is what forces React to throw the server tree away.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Fix a component that renders `{new Date().toLocaleTimeString()}` and `{localStorage.getItem("theme")}` directly in JSX, by making the first render deterministic or passing the value from the server. Give the corrected code and say why the original flashes and errors.

**Think about:**
- Why must the first client render match the server HTML?
- What is the two-pass `useEffect` fix?
- When is `suppressHydrationWarning` appropriate?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The original renders two values the server and client cannot agree on. `new Date().toLocaleTimeString()` is evaluated at server-render time and again at hydration time, so the two clocks differ by whatever wall-clock gap separates the render from the hydrate. `localStorage.getItem("theme")` does not exist on the server at all, so the server renders one thing (a crash or a fallback) and the client renders the real stored value. Either way the first client render disagrees with the server HTML.

Corrected code:

```tsx
function Widget({ theme }: { theme: string }) {
  // theme comes from the server, which read the cookie: both passes agree.
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    setTime(new Date().toLocaleTimeString());
    const id = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div>
      <span>{time ?? " "}</span>
      <span>{theme}</span>
    </div>
  );
}
// Server (App Router): const theme = cookies().get("theme")?.value ?? "light";
// <Widget theme={theme} />
```

**WHY at the mechanism level:** hydration is not a re-render, it is React adopting the existing server DOM and attaching handlers, and it assumes the tree it computes on the first client pass equals the server HTML. `time` starts `null` on both server and client so the first render matches; `useEffect` runs only after hydration commits, so filling in the live time is a normal state update, not a mismatch. `theme` is passed from the server, so the client never guesses.

**How to spot it in review:** grep the component body for `new Date()`, `Date.now()`, `Math.random()`, `window`, `localStorage`, or `sessionStorage`. Any of them read during render on an SSR page is a hydration bug waiting to happen.

**Production symptom:** a visible content flash (server value paints, then swaps) and `Hydration failed because the server rendered HTML didn't match the client` in the console. Under load you also lose the SSR benefit for that boundary because React client-renders it from scratch.

**Common misconception corrected:** `suppressHydrationWarning` does not fix this. It is only appropriate on a single leaf whose content is intentionally client-specific and you accept the difference (a timestamp), and even then React still re-renders that node. It cannot rescue a structural mismatch (different tags or child counts), and it should never be reached for to quiet a real determinism bug.

**Self-check rubric:**
- [ ] I explained the first client render must equal the server HTML because hydration adopts, not replaces, the DOM.
- [ ] My fix renders a stable placeholder and moves the client-only value into `useEffect`.
- [ ] I passed the storage/cookie value from the server instead of reading `localStorage` in render.
- [ ] I named the production symptoms: content flash plus the hydration console error.
- [ ] I stated `suppressHydrationWarning` does not repair structural mismatches.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Diagnose a "flash of wrong theme" bug at scale. An e-commerce homepage renders `<html className={localStorage.getItem("theme") === "dark" ? "dark" : "light"}>` and users report a white flash on every load before the page snaps to dark mode, plus intermittent hydration errors in Sentry. Explain the root cause and give a fix that removes the flash entirely.

**Model answer (revealed on demand):**

The root cause is that `localStorage` is unreadable on the server, so the server always emits `className="light"`. The client hydrates, reads the real stored `"dark"`, and the mismatch forces React to correct that node, producing the flash of light theme before dark applies. Because the mismatch is on `<html>`, it also throws the hydration error your Sentry is catching.

`useEffect` alone does not remove the flash here, because the effect runs after paint, so the user still sees light first. The theme must be correct in the very first byte of HTML. Two production-grade fixes:

```tsx
// 1) Persist theme in a cookie, not localStorage, and read it on the server.
export default function RootLayout({ children }) {
  const theme = cookies().get("theme")?.value ?? "light";
  return <html className={theme}>{children}</html>; // correct in the SSR HTML
}
```

```tsx
// 2) If you must use localStorage, run a tiny blocking script BEFORE paint
// that sets the class from storage, and render the class deterministically.
// This is the next-themes pattern.
<script dangerouslySetInnerHTML={{ __html:
  `document.documentElement.className =
     localStorage.getItem("theme") || "light";` }} />
```

Fix 1 is the right default: cookies travel with the request, so the server knows the theme and the HTML is correct on arrival, no flash, no mismatch. Fix 2 is for storage-only setups: the inline script mutates `<html>` before React hydrates and before first paint, so the class is already correct when pixels appear. Pair it with `suppressHydrationWarning` on the `<html>` element, which is the one legitimate use of that flag, since you have deliberately made the DOM authoritative over React for that single attribute.

**How to spot it in review:** any theme, locale, or auth value read from `localStorage` during render on an SSR route, especially on `<html>`/`<body>`. **Production symptom:** flash of unstyled or wrong-themed content (FOUC) on every cold load plus recurring hydration errors in monitoring. **Misconception:** "wrapping it in `useEffect` fixes the flash." It fixes the error but not the flash, because the effect runs after the wrong-theme paint; the value must be right in the server HTML or set by a pre-paint script.

### ajr-l11-streaming-ssr-suspense: Streaming SSR and Suspense boundaries

- **id:** `ajr-l11-streaming-ssr-suspense`  ·  **difficulty:** hard  ·  **est:** 14 min  ·  **demo:** react-demo  ·  **skills:** react, streaming, suspense

#### Learn

Streaming SSR means the server does not wait for the whole page to be ready before sending HTML. It flushes the parts that are ready immediately and streams the slow parts later, as their data resolves. The tool that tells React where it is allowed to split the stream is `<Suspense>`. A Suspense boundary says: "if the subtree inside me is not ready, send my `fallback` now and stream the real content in when it resolves." Without a boundary, React has no place to split, so a slow child holds the entire response hostage.

Consider a dashboard where the header and nav are instant but one widget waits on a 2000ms analytics call:

```tsx
// BAD: no boundary. The whole document blocks on the slowest fetch.
export default function Dashboard() {
  return (
    <Shell>
      <Header />                {/* ready at ~0ms */}
      <SlowAnalytics />         {/* awaits a 2000ms fetch */}
    </Shell>
  );
}
```

`SlowAnalytics` suspends (its data is a promise). With no `<Suspense>` above it, the nearest boundary is the document root, so React cannot flush *anything*, not even the header, until the 2000ms fetch resolves. The user stares at a blank page for two seconds, then everything appears at once. You have SSR but with the latency of the slowest thing on the page.

Wrap each slow section in its own boundary and the picture inverts:

```tsx
// GOOD: the shell flushes immediately, slow widgets stream in with skeletons.
export default function Dashboard() {
  return (
    <Shell>
      <Header />
      <Suspense fallback={<AnalyticsSkeleton />}>
        <ErrorBoundary fallback={<WidgetError />}>
          <SlowAnalytics />
        </ErrorBoundary>
      </Suspense>
    </Shell>
  );
}
```

Now React flushes the shell plus `<Header />` plus the `AnalyticsSkeleton` at ~50ms. The connection stays open. When the 2000ms fetch resolves, React streams a second chunk containing the real `SlowAnalytics` HTML plus a tiny inline script that swaps it in place of the skeleton. First paint is 50ms instead of 2000ms, and the slow widget arrives when it can without blocking the rest.

The reason each async boundary should also get an **error boundary** is that a suspended fetch can reject, not just resolve. If `SlowAnalytics` throws (the analytics service 500s) and there is no error boundary between it and the root, the error propagates to the nearest boundary above, which can blank or crash the whole page. A co-located `ErrorBoundary` catches the rejection and renders `<WidgetError />` in that slot only, so one failed widget degrades to an inline error while the rest of the dashboard stays live. Suspense handles "not ready yet"; the error boundary handles "will never be ready." You need both to isolate a subtree.

**Interview nuance:** the mental model to correct is "SSR is all-or-nothing." It was, before streaming. Modern React SSR (`renderToPipeableStream`, and the App Router on top of it) is incremental: the boundaries you draw are literally the chunk boundaries of the HTTP response. Where you place `<Suspense>` is a direct, observable performance decision, not a styling detail.

**Interview nuance:** a skeleton is not just decoration, it is the fallback React commits into the stream synchronously. A boundary with `fallback={null}` still unblocks the shell, but the user sees an empty gap; a real skeleton keeps layout stable and communicates "loading here," which also prevents layout shift when the content streams in.

Recap: streaming SSR flushes ready HTML first and streams slow subtrees later, and `<Suspense>` is what marks where React may split the stream; without a boundary the slowest fetch blocks the entire response to a blank wait, so wrap each slow section in its own `<Suspense>` with a skeleton and pair it with a co-located error boundary so a rejected fetch degrades one widget instead of crashing the page.

#### See it live

**Demo (react-demo):** a horizontal timeline visualizer of one streamed response, with a "Wrap slow widget in Suspense" toggle and a "Fail the widget" toggle, showing when each chunk flushes.

A **timeline** runs left to right in milliseconds (0 to ~2100ms). Three stacked lanes: **Shell**, **Header**, and **Analytics**. A moving playhead animates a request. With Suspense **off**, all three lanes stay grey until 2000ms, then all light up green together and a "First paint: 2000ms" badge appears. Flip **"Wrap slow widget in Suspense" on** and the Shell and Header lanes light green at ~50ms (badge: "First paint: 50ms"), the Analytics lane shows a striped **skeleton** block from 50ms to 2000ms, then flips to solid green at 2000ms as its chunk streams in. A separate **"Fail the widget"** toggle makes the Analytics lane turn red at 2000ms; with an error boundary present the red is confined to that one lane while Shell and Header stay green. The widget is built around:

```tsx
<Shell>
  <Header />
  {useSuspense ? (
    <Suspense fallback={<AnalyticsSkeleton />}>
      <ErrorBoundary fallback={<WidgetError />}>
        <SlowAnalytics failing={failing} /> {/* awaits a mock 2000ms fetch */}
      </ErrorBoundary>
    </Suspense>
  ) : (
    <SlowAnalytics failing={failing} />       {/* no boundary: blocks the shell */}
  )}
</Shell>
```

**Watch:** with Suspense off, nothing paints until 2000ms and the whole timeline flushes as one late block, proving the shell was held hostage by the slow fetch. With Suspense on, the shell and header paint at 50ms with a skeleton in the analytics slot, and the real widget streams in at 2000ms, proving React split the response at the boundary. Toggle "Fail the widget" and the error boundary keeps the red failure inside the analytics lane while the rest stays green, proving a rejected fetch is isolated. This is a simulation of the streaming timeline (the demo scripts the flush times rather than running a real Node stream), but the chunk ordering and boundary behavior mirror `renderToPipeableStream`.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Wrap the slow sections of a dashboard in Suspense with skeletons and add error boundaries so one slow or failed widget does not stall or crash the rest. Give the corrected JSX and explain what React can flush first and why.

**Think about:**
- What does Suspense let React flush first?
- What happens with no boundary around slow data?
- Why pair each async boundary with an error boundary?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

With no boundary, the nearest place React can split the stream is the document root, so a single slow child forces React to buffer the entire response until that child resolves. The header, nav, and everything else are ready in milliseconds but the user sees a blank page for as long as the slowest fetch takes. The fix is to give each slow section its own Suspense boundary with a skeleton, and co-locate an error boundary inside it:

```tsx
export default function Dashboard() {
  return (
    <Shell>
      <Header />                     {/* flushes immediately */}
      <Nav />                        {/* flushes immediately */}
      <Suspense fallback={<AnalyticsSkeleton />}>
        <ErrorBoundary fallback={<WidgetError name="analytics" />}>
          <SlowAnalytics />          {/* 2000ms fetch, streams in later */}
        </ErrorBoundary>
      </Suspense>
      <Suspense fallback={<FeedSkeleton />}>
        <ErrorBoundary fallback={<WidgetError name="feed" />}>
          <ActivityFeed />           {/* 800ms fetch, independent */}
        </ErrorBoundary>
      </Suspense>
    </Shell>
  );
}
```

**WHY at the mechanism level:** a Suspense boundary is a legal split point in the HTTP stream. React renders down until it hits a suspended component, commits that boundary's `fallback` into the current chunk, flushes everything above it immediately, and keeps the connection open. When each promise resolves, React streams a follow-up chunk with the real subtree plus an inline script that replaces the skeleton in place. Independent boundaries resolve independently, so the 800ms feed streams in before the 2000ms analytics; neither waits on the other.

**How to spot it in review:** an `await` or a suspending data read (`use(promise)`, a data-fetching hook) with no `<Suspense>` between it and the layout root, or a Suspense boundary with no error boundary inside it.

**Production symptom:** a page whose Time To First Byte is fine but First Contentful Paint is pinned to the slowest API call, so the whole dashboard shows blank until the one slow widget is ready. Without error boundaries, that slow widget throwing takes the entire page down instead of showing an inline error.

**Common misconception corrected:** "SSR is all-or-nothing, so I have to wait for all data before sending HTML." Streaming SSR is incremental. The boundaries you place are the chunk boundaries; drawing them well is the difference between a 50ms and a 2000ms first paint.

**Self-check rubric:**
- [ ] I wrapped each slow section in its own `<Suspense>` with a real skeleton fallback.
- [ ] I explained the shell and fast content flush first because the boundary is a stream split point.
- [ ] I co-located an error boundary inside each Suspense to isolate rejected fetches.
- [ ] I noted independent boundaries stream in independently, fastest first.
- [ ] I named the symptom: first paint blocked to the slowest fetch, or one widget crashing the page.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the Suspense layout for a product page under a "streaming waterfall" trap. The page has a fast product header, a medium reviews section (600ms), and a slow "customers also bought" recommendations rail (1800ms) that occasionally 500s. A junior wrapped the whole `<main>` in one Suspense boundary "to be safe." Explain why that is barely better than no boundary and give the correct per-section layout with the ordering guarantees.

**Model answer (revealed on demand):**

One Suspense around the whole `<main>` is barely better than none, because a boundary only unblocks content *above* it, and its fallback is shown until *everything inside* it resolves. If reviews and recommendations share one boundary, React cannot stream the 600ms reviews until the 1800ms recommendations are also ready, so the entire `<main>` waits on the slowest child inside the shared boundary. You collapsed two independent fetches into one, paced by the slower one.

The fix is one boundary per independently-resolving section:

```tsx
<main>
  <ProductHeader product={product} />       {/* flushes at ~50ms */}
  <Suspense fallback={<ReviewsSkeleton />}>
    <ErrorBoundary fallback={<SectionError name="reviews" />}>
      <Reviews id={id} />                    {/* 600ms, streams at ~600ms */}
    </ErrorBoundary>
  </Suspense>
  <Suspense fallback={<RecsSkeleton />}>
    <ErrorBoundary fallback={<SectionError name="recommendations" />}>
      <Recommendations id={id} />            {/* 1800ms, may 500 */}
    </ErrorBoundary>
  </Suspense>
</main>
```

Now the header paints at 50ms, reviews stream in at ~600ms, and recommendations stream in at ~1800ms, each independently. The ordering guarantee is that React flushes each boundary as its own data resolves, so a user reads reviews a full 1.2 seconds before the slow rail arrives, instead of waiting 1.8 seconds for both.

**How to spot it in review:** a single Suspense wrapping multiple unrelated async sections, or a boundary scoped to a whole route/layout rather than a section. **Production symptom:** first paint is fast but the fast section is needlessly delayed to the slowest sibling's latency, and when recommendations 500s the shared boundary shows one error swallowing the healthy reviews too. **Misconception:** "one big Suspense is safer." It is coarser, not safer: it couples independent latencies and couples failures. Boundaries should trace the seams where data resolves and where failure should be contained.

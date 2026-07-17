> Module **8.6** (Code Splitting & Bundle) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [8.5](./l8-virtualization-transitions.md) · Next: [9.1](./l9-timer-subscription-leaks.md)

# L8 · Code Splitting & Bundle

Every prior module in L8 made an existing render cheaper. This module makes the render not ship at all. After it you can catch the three mistakes that quietly balloon a client bundle: eager-importing a heavy component instead of lazy-loading it, defeating tree-shaking with barrel imports and root-package imports, and marking a whole page `"use client"` so static work and heavy libraries hydrate on the browser when they never needed to leave the server.

### ajr-l8-code-splitting-lazy: Code splitting with React.lazy and Suspense

- **id:** `ajr-l8-code-splitting-lazy`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** react, code-splitting, bundle

#### Learn

A `memo` or `useMemo` makes a component cheaper to re-render. It does nothing about the fact that the component's code was downloaded, parsed, and compiled before the user ever saw the tab it lives on. Code splitting is the lever for that: it removes code from the initial download entirely and fetches it on demand.

The mechanism is the dynamic `import()`. A static `import Chart from "./Chart"` tells the bundler "this is needed up front, staple it into the main bundle." A dynamic `import("./Chart")` is a function call that returns a `Promise<Module>`, and the bundler treats the target as a **split point**: it emits `Chart` (and its dependencies) as a separate chunk that is fetched over the network only when that `import()` actually runs.

`React.lazy` wraps that Promise so React can render it:

```tsx
import { lazy, Suspense } from "react";

// module scope, not inside a component
const Chart = lazy(() => import("./Chart")); // ./Chart must be a default export

function Analytics() {
  return (
    <Suspense fallback={<Spinner />}>
      <Chart data={data} />
    </Suspense>
  );
}
```

`lazy` returns a component that, on first render, calls its factory (`() => import("./Chart")`), which triggers the network request for the chunk. Until the Promise resolves the component **suspends**, and the nearest `Suspense` boundary above it shows the `fallback`. When the chunk arrives React swaps in the real `Chart`.

Two mistakes reintroduce bugs. First, declaring `lazy` **inside** a component:

```tsx
function Analytics() {
  const Chart = lazy(() => import("./Chart")); // wrong: new component identity every render
  return <Suspense fallback={<Spinner />}><Chart /></Suspense>;
}
```

`lazy` must live at module scope because the returned component's identity has to be stable. Created inside render, it is a brand-new component type on every render, so React unmounts and remounts it (re-fetching, re-suspending, losing its state) each time the parent renders. Second, forgetting the `Suspense` ancestor: a suspending `lazy` component with no `Suspense` above it throws to the nearest error boundary or crashes the render.

**Interview nuance:** dynamic `import()` returns a Promise for the *module namespace object*, so the thing you lazy-load must be exposed as `default`. For a named export, adapt in the factory: `lazy(() => import("./Chart").then((m) => ({ default: m.BarChart })))`.

**Interview nuance:** do not over-split. Every chunk is a separate request with its own round-trip and compression overhead; a hundred 2KB chunks can be slower than one 200KB chunk. Split at meaningful boundaries (routes, tabs, modals, rarely-opened heavy widgets), not around every leaf. And beware the **lazy waterfall**: a lazy component that, once loaded, immediately lazy-loads a lazy child, so the user waits for request A to finish before request B even starts. Preload or hoist the split so the requests overlap.

Recap: dynamic `import()` creates a separate chunk fetched on demand; `React.lazy` suspends until it resolves and needs a `Suspense` boundary above it; keep `lazy` at module scope for stable identity; split at real boundaries and avoid chained lazy waterfalls.

#### See it live

**Demo (react-demo):** an app that imports a 300KB chart eagerly versus with `React.lazy` + `Suspense`, showing an initial-bundle meter and a per-tab chunk list.

A widget with a mode toggle at the top: "Eager import" versus "Lazy + Suspense". Below it is an **initial-bundle meter** (a labeled bar reading "initial JS: N KB") and a two-tab strip: "Home" and "Analytics". Under the tabs is a **chunk list** that logs each chunk as it "downloads" with its size and the moment it arrived. The Analytics tab is built around this snippet:

```tsx
const Chart = lazy(() => import("./Chart")); // simulated 300KB chunk

function App({ mode }: { mode: "eager" | "lazy" }) {
  const [tab, setTab] = useState<"home" | "analytics">("home");
  return (
    <>
      <nav>
        <button onClick={() => setTab("home")}>Home</button>
        <button onClick={() => setTab("analytics")}>Analytics</button>
      </nav>
      {tab === "analytics" &&
        (mode === "eager" ? (
          <EagerChart data={data} />
        ) : (
          <Suspense fallback={<Spinner />}>
            <Chart data={data} />
          </Suspense>
        ))}
    </>
  );
}
```

In "Eager" mode the meter shows the initial bundle already carrying the 300KB chart, and switching to the Analytics tab is instant (the code was there all along). In "Lazy" mode the meter drops by ~300KB, and the chunk list stays empty until you click the Analytics tab, at which point a "Chart.chunk.js · 300KB" row appears (with a brief spinner) as it downloads.

**Watch:** flip to "Lazy + Suspense" and watch the initial-JS meter fall by roughly 300KB immediately, with the chunk list still empty because nothing on Home pulled the chart. Click "Analytics" and watch a new chunk row download on demand behind the `Suspense` fallback, then the chart appear. This is real React `lazy`/`Suspense` behavior; the chunk sizes and download delay are simulated (the demo mocks the network with a timed Promise rather than a real bundler split), but the split-point timing is faithful: the code arrives only when the tab that needs it opens.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Load a 300KB chart library only when the Analytics tab opens, using `React.lazy` + `Suspense`, and confirm the chunk splits. Start from a version that does `import BigChart from "./BigChart"` at the top of the page and rewrite it so the chart code leaves the initial bundle.

**Think about:**
- What does dynamic `import()` produce?
- Why must `React.lazy` be at module scope?
- What is a lazy waterfall?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The static `import BigChart from "./BigChart"` staples the 300KB chart into the main bundle, so it downloads and parses on first load even for users who never open Analytics. Convert the import to a split point:

```tsx
import { lazy, Suspense } from "react";

// module scope: stable component identity
const BigChart = lazy(() => import("./BigChart"));

function AnalyticsPage() {
  const [tab, setTab] = useState<"overview" | "analytics">("overview");
  return (
    <>
      <Tabs value={tab} onChange={setTab} />
      {tab === "analytics" && (
        <Suspense fallback={<ChartSkeleton />}>
          <BigChart data={data} />
        </Suspense>
      )}
    </>
  );
}
```

**WHY at the mechanism level:** the bundler sees `import("./BigChart")` (a call, not a static import) and emits `BigChart` plus its deps as a separate chunk. That factory does not run until `<BigChart>` first renders, which only happens when `tab === "analytics"`. On that first render `lazy` calls the factory, the chunk request fires, the component **suspends**, and the nearest `Suspense` shows `ChartSkeleton` until the Promise resolves. The 300KB never touches the initial download.

**How to confirm the split:** in a real build, run the bundle analyzer or open the Network tab and switch to Analytics: you should see the initial JS drop by ~300KB and a new `BigChart.[hash].js` request fire only on the tab click.

**How to spot it in review:** a `lazy(() => import(...))` declared *inside* a component body (new identity per render forces remount, re-fetch, and lost state), or a suspending `lazy` component with no `Suspense` ancestor (crashes or bubbles to an error boundary). Also flag a default-vs-named mismatch: `import()` resolves to the module namespace, so `lazy` needs a `default` export or a `.then((m) => ({ default: m.Named }))` adapter.

**Production symptom:** a huge initial bundle that blocks first paint and Time To Interactive, especially on mobile, because a heavy widget most users never open is shipped to everyone up front.

**Common misconception corrected:** "more splitting is always better." Over-splitting into many tiny chunks adds a network round-trip and compression overhead per chunk and can be slower than one reasonable chunk. Split at real boundaries (routes, tabs, modals), and avoid the lazy waterfall where one lazy chunk only starts loading its lazy child after it resolves.

**Self-check rubric:**
- [ ] I moved `lazy(() => import(...))` to module scope and said why identity must be stable.
- [ ] I wrapped the lazy component in a `Suspense` boundary with a fallback.
- [ ] I explained that dynamic `import()` produces a separate on-demand chunk (a Promise for the module).
- [ ] I named how to confirm the split (analyzer or Network tab shows the initial bundle drop and a new chunk).
- [ ] I noted over-splitting and lazy waterfalls as real costs.

#### Practice: real-world variant (save, then reveal)

**Prompt:** At a fintech dashboard, the "Export to PDF" button pulls in a 500KB PDF library plus a 200KB charting dependency, and that code is in the main bundle even though under 2% of sessions ever click Export. A teammate wraps the button's click handler in a dynamic `import()` but the modal that renders the preview still lazy-loads a lazy child, so opening Export shows two spinners back to back and takes ~2.5s on 3G. Rewrite the loading so the code splits AND the two requests overlap, and say how you would prove the waterfall is gone.

**Model answer (revealed on demand):**

Two things are wrong: only the click handler was split (good), but the preview modal introduces a **lazy waterfall**, where chunk B does not begin downloading until chunk A resolves and renders, serializing two round-trips.

Split at the modal boundary and **preload both chunks in parallel** the moment Export is clicked, before rendering:

```tsx
const ExportModal = lazy(() => import("./ExportModal")); // contains the PDF lib
const preloadPdf = () => import("./pdf-engine"); // the heavy dep, separately

function ExportButton() {
  const [open, setOpen] = useState(false);
  const onClick = () => {
    // fire both requests together, do not await serially
    void import("./ExportModal");
    void preloadPdf();
    setOpen(true);
  };
  return (
    <>
      <button onClick={onClick} onMouseEnter={() => void import("./ExportModal")}>
        Export to PDF
      </button>
      {open && (
        <Suspense fallback={<ModalSkeleton />}>
          <ExportModal />
        </Suspense>
      )}
    </>
  );
}
```

**WHY at the mechanism level:** calling `import("./ExportModal")` and `preloadPdf()` in the same tick starts both network requests concurrently instead of chaining them. When `<ExportModal>` renders, its chunk is already in flight (often already cached), and because the PDF engine was requested at the same time rather than *inside* the modal after it mounts, the two round-trips overlap instead of stacking. The `onMouseEnter` preload goes further: it warms the modal chunk during the ~200ms of hover intent, so the click often finds it already resolved.

**How to prove the waterfall is gone:** in the Network tab (throttled to 3G), record opening Export. Before, you see request A finish, then request B *start* (a clear staircase). After, both requests start at the same timestamp and their bars overlap, and total time drops toward the single slower request instead of their sum. The user sees one skeleton, not two sequential spinners.

**Production symptom:** a feature that feels fine on fast office wifi but shows stacked spinners and multi-second waits on real mobile networks, because chained lazy boundaries turn one user action into a sequence of dependent round-trips.

**Self-check rubric:**
- [ ] I split at the modal boundary, not just the click handler.
- [ ] I kicked off both chunk requests in the same tick so they overlap.
- [ ] I explained the waterfall as serialized dependent round-trips and why parallel requests fix it.
- [ ] I named a Network-tab check (overlapping bars, total time near the slower request).

---

### ajr-l8-bundle-bloat-treeshaking: Bundle bloat: tree-shaking and barrel files

- **id:** `ajr-l8-bundle-bloat-treeshaking`  ·  **difficulty:** hard  ·  **est:** 14 min  ·  **demo:** react-demo  ·  **skills:** bundle, tree-shaking, rsc

#### Learn

Code splitting decides *when* code ships. Tree-shaking decides *whether the unused parts of it ship at all*. The bundler tries to drop exports you never import (dead-code elimination), but only when it can prove the code is safe to drop. Two common patterns quietly defeat that proof and drag dead weight into the client bundle, and no amount of runtime `memo` touches it, because this is a build-time problem, not a render-time one.

Tree-shaking needs two things: **static ES modules** (so the bundler can statically see which named exports you use) and **no side effects** on the unused code (so removing it is provably safe). The classic offender is importing from a package **root**:

```tsx
import { debounce } from "lodash"; // pulls a lot more than debounce
```

`lodash` (the CommonJS default) is not authored as tree-shakeable ES modules, so the bundler often cannot isolate just `debounce` and pulls a large slice of the library. The fix is a per-path import, or the ESM build:

```tsx
import debounce from "lodash/debounce"; // just that function's file
// or
import { debounce } from "lodash-es"; // ESM, tree-shakeable
```

The second offender is the **barrel file**: an `index.ts` that re-exports everything so callers can write one tidy import.

```tsx
// icons/index.ts  (barrel)
export * from "./Home";
export * from "./Chart";
export * from "./Settings"; // ...and 400 more
```

```tsx
import { HomeIcon } from "@/icons"; // reaches through the barrel
```

Even though you used one icon, importing through the barrel can force the bundler to evaluate the whole `index.ts` module graph. If any re-exported module has side effects, or the package is not flagged `"sideEffects": false`, the bundler must keep it all to be safe. Result: you shipped 400 icons to render one. The fix is to import from the concrete path, `import { HomeIcon } from "@/icons/Home"`, or drop the barrel.

The third source of bloat is React-Server-Components specific: everything imported into a `"use client"` module tree ships to the browser. A `"use client"` at the top of a page drags every child, and every library those children import, into the client bundle, even the static, non-interactive parts.

**Interview nuance:** `sideEffects: false` in a package's `package.json` is a promise to the bundler that importing a module for its named exports has no observable side effect, so unused ones can be dropped. If it is missing or wrong (a module that, say, registers a global on import), the bundler must conservatively keep the module even if you never use its exports. This is why some libraries are stubbornly un-shakeable regardless of import style.

**Interview nuance:** you cannot reliably eyeball this. The truth lives in the bundle analyzer (webpack-bundle-analyzer, `@next/bundle-analyzer`, or Vite's rollup visualizer), which draws every module as a sized rectangle. Diagnose from the treemap, not from intuition.

Recap: tree-shaking needs static ESM plus provably side-effect-free code; root-package imports of non-ESM libs and barrel re-exports both defeat it and ship dead weight; per-path imports (or the `-es` build) and a smaller `"use client"` surface fix it; confirm with the analyzer, never by guessing.

#### See it live

**Demo (react-demo):** a treemap of bundle contents where each library is a sized rectangle, with a toggle switching barrel imports versus specific-path imports.

A widget rendering a **bundle treemap**: nested rectangles sized by KB, one big block per library (`lodash`, `@/icons`, `date-fns`, your app code), with a running total at the top ("client bundle: N KB"). A toggle labeled "Import style: barrel / per-path" flips the imports the treemap represents. A second toggle, "`use client` boundary: page root / small island", shrinks the client tree. The treemap is driven by this contrast:

```tsx
// A) barrel + root imports (fat)
import { debounce } from "lodash";
import { HomeIcon } from "@/icons"; // barrel index.ts re-exporting 400 icons

// B) per-path imports (lean)
import debounce from "lodash/debounce";
import { HomeIcon } from "@/icons/Home";
```

In mode A the `lodash` rectangle is large and the `@/icons` rectangle balloons to hold hundreds of icons; the total might read ~520KB. Flip to mode B and the `lodash` block shrinks to a sliver and `@/icons` collapses to a single small tile; the total drops toward ~320KB. Flipping the `"use client"` toggle to "small island" removes whole rectangles that only existed because a static subtree had been dragged into the client tree.

**Watch:** toggle "barrel / per-path" and watch the `lodash` and `@/icons` rectangles (and the total KB) visibly shrink, then grow back when you toggle to barrel. This illustrates a **build-time** transform: the demo is not running a real bundler in your browser, it is showing the analyzer treemap each import style would produce, so treat the shapes and relative sizes as faithful and the exact KB as representative rather than measured live. The point it proves is directional and reliable: import style, not runtime code, is what moves these blocks.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Cut 200KB from the client bundle: switch a `lodash` root import and an icon barrel to per-path imports and shrink a `"use client"` boundary, reading the analyzer diff. You are given a treemap where `lodash` is ~70KB, `@/icons` is ~110KB for one used icon, and a `"use client"` page root has pulled a static `<ArticleBody>` and its markdown lib into the client tree.

**Think about:**
- What defeats tree-shaking?
- How much does import style change for large libs?
- What ships under a `"use client"` tree?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

Three independent leaks, each fixed at build time:

```tsx
// 1) lodash root -> per-path (or lodash-es)
- import { debounce } from "lodash";
+ import debounce from "lodash/debounce";

// 2) icon barrel -> concrete path
- import { HomeIcon } from "@/icons";
+ import { HomeIcon } from "@/icons/Home";

// 3) push "use client" down: page stays a Server Component,
//    only the interactive bit is a client island
// page.tsx  (no "use client")
import { ArticleBody } from "./ArticleBody"; // stays server, markdown lib never ships
import { LikeButton } from "./LikeButton";   // "use client" lives here, tiny
```

**WHY at the mechanism level:** tree-shaking can only drop an export it can *statically prove* is unused and side-effect-free. Importing `lodash` at the root pulls a non-ESM module the bundler cannot cleanly split, so ~70KB rides along for one function; `lodash/debounce` imports just that function's file. The icon barrel's `index.ts` re-exports hundreds of modules, so importing through it forces the bundler to evaluate (and, absent a reliable `sideEffects: false`, keep) the whole set; the concrete path touches one file. And every module inside a `"use client"` tree is serialized into the client bundle by definition, so a `"use client"` at the page root dragged the static `ArticleBody` and its markdown/highlighter dependency to the browser even though they render no interactivity. Moving `"use client"` down to `LikeButton` leaves the article on the server, where its code never ships.

**How to spot it in review:** root-package imports of big libraries (`from "lodash"`, `from "@mui/material"`, `from "@/icons"`), giant barrel `index.ts` files, and a `"use client"` at or near a route/page root with heavy or static children under it.

**Production symptom:** tens of KB of dead code in the client bundle, an inflated Time To Interactive, and an analyzer treemap dominated by a library you use one function from.

**Common misconception corrected:** "I can reason about what shipped." You cannot, reliably. Bundlers, `sideEffects` flags, and package authoring interact in non-obvious ways, and the same import can be shakeable in one library and not another. Read the analyzer treemap and diff it before and after; let the measured rectangles, not intuition, tell you what actually shrank.

**Self-check rubric:**
- [ ] I converted the `lodash` root import to a per-path (or `lodash-es`) import.
- [ ] I imported the icon from its concrete path instead of the barrel.
- [ ] I pushed `"use client"` down so the static subtree stays on the server.
- [ ] I explained tree-shaking needs static ESM + provable no-side-effects.
- [ ] I said I would verify with a before/after analyzer diff, not by guessing.

#### Practice: real-world variant (save, then reveal)

**Prompt:** At an e-commerce team, the product page's client bundle grew from 180KB to 640KB over two quarters and nobody knows why. The analyzer shows `moment` (locale files included), the full `@aws-sdk/client-s3`, and an `@/components` barrel all in the client bundle. A junior engineer proposes wrapping the slow components in `React.memo`. Explain why `memo` cannot help here, then give the three highest-leverage cuts and how you would guard against regressions.

**Model answer (revealed on demand):**

`React.memo` is a **runtime** re-render gate. It can stop a component from re-rendering, but the component's code, and every library it imports, was already downloaded, parsed, and compiled before the first render. Bundle size is a **build-time** concern. Memoizing the product page changes zero bytes of what shipped, so it cannot address a 640KB bundle. This is the module's core distinction: `memo` optimizes renders, tree-shaking and import hygiene optimize what ships.

The three highest-leverage cuts:

1. **`moment` -> `date-fns` (per-path) or `Temporal`/Intl.** `moment` is not tree-shakeable and bundles every locale by default, often 200KB+. Import only the `date-fns` functions you use (`import format from "date-fns/format"`), or use the built-in `Intl.DateTimeFormat`, which ships zero bytes.

2. **`@aws-sdk/client-s3` off the client entirely.** An S3 client has no business in a browser bundle; presigned-URL generation or uploads should happen on the server (a route handler or Server Action). This is likely a `"use client"` boundary leak where a server concern got imported into a client module. Move it server-side and it disappears from the client treemap completely.

3. **`@/components` barrel -> concrete paths.** A components barrel that re-exports the entire design system forces every consumer to potentially pull the whole set. Import from concrete paths and, if the barrel is unavoidable, ensure the package sets `"sideEffects": false` so unused re-exports can be dropped.

**How to guard against regressions:** add a **bundle-size budget** to CI (for example `size-limit` or Next's built-in bundle analysis on a threshold) so a PR that pushes the client bundle over budget fails the build. Bundles rot silently precisely because size is invisible in code review; a hard gate makes the treemap a first-class check instead of an archaeology project two quarters later.

**Production symptom:** a bundle that creeps up release over release with no single obvious cause, degrading mobile TTI, until someone finally opens the analyzer and finds a server SDK, a locale-heavy date library, and a barrel all riding in the client.

**Self-check rubric:**
- [ ] I explained `memo` is runtime and bundle size is build-time, so `memo` cannot help.
- [ ] I named the three cuts (locale-heavy date lib, server SDK on the client, barrel).
- [ ] I moved the server-only SDK off the client via server code.
- [ ] I proposed a CI bundle-size budget to prevent regressions.

---

### ajr-l8-rsc-move-off-client: Server Components as a perf lever

- **id:** `ajr-l8-rsc-move-off-client`  ·  **difficulty:** hard  ·  **est:** 14 min  ·  **demo:** react-demo  ·  **skills:** rsc, performance, bundle

#### Learn

The previous two lessons trimmed the client bundle. Server Components let you delete parts of it. A React Server Component renders **on the server** to a serialized description of its output (the RSC payload), and its component code **never ships to the browser and never hydrates**. Zero component JS. The most powerful bundle optimization available is often not memoizing the client component but moving it, and the work it does, off the client entirely.

The dividing line is the `"use client"` directive. A module with `"use client"` at the top, and everything it imports, is a **client component**: its code ships to the browser, it hydrates, and it can re-render. Everything else defaults to a **server component**: it runs on the server, emits a payload, and ships no JS. The boundary is directional: once you cross into `"use client"`, everything below is client too.

The expensive mistake is placing `"use client"` too high. Consider a page that renders a big static article plus one small "like" button:

```tsx
"use client"; // WRONG: at the page root, drags everything to the client

import { markdownToReact } from "heavy-markdown-lib"; // 200KB
import { highlight } from "heavy-syntax-highlighter"; // 200KB

export default function ArticlePage({ source }: { source: string }) {
  const [likes, setLikes] = useState(0);
  return (
    <article>
      {markdownToReact(source)}      {/* static, but now runs on the client */}
      <button onClick={() => setLikes((l) => l + 1)}>♥ {likes}</button>
    </article>
  );
}
```

That one `"use client"` ships 400KB of markdown and highlighter code to every reader and runs the formatting in the browser, all to power a single `useState`. Push the boundary **down** to only the interactive leaf:

```tsx
// ArticlePage.tsx  -> Server Component (no directive)
import { markdownToReact } from "heavy-markdown-lib"; // stays on the server
import { LikeButton } from "./LikeButton";

export default function ArticlePage({ source }: { source: string }) {
  return (
    <article>
      {markdownToReact(source)}   {/* rendered on the server, ships as payload */}
      <LikeButton />              {/* the only client code */}
    </article>
  );
}
```

```tsx
// LikeButton.tsx
"use client";
import { useState } from "react";
export function LikeButton() {
  const [likes, setLikes] = useState(0);
  return <button onClick={() => setLikes((l) => l + 1)}>♥ {likes}</button>;
}
```

Now the markdown and highlighter code stay on the server. The browser receives the rendered HTML/payload for the article plus the tiny `LikeButton` bundle. The 400KB is gone from the client.

**Interview nuance:** server components have hard limits. They cannot use state or effects (`useState`, `useEffect`), cannot use browser APIs (`window`, `localStorage`), and cannot take event-handler props like `onClick`, because none of that exists during a server render and none of it is shipped to run later. They *can* be `async` and `await` data directly. Interactivity must live in a `"use client"` leaf. The design pattern is "static/data on the server, interactive islands on the client."

**Interview nuance:** a server component can *render* a client component and pass it props (including server-fetched data), but a client component can only render a server component if that server component was passed to it as `children`/a prop, not by importing it. This is why "push `"use client"` down and pass server-rendered content in as children" is the canonical refactor.

Recap: server components render to a payload and never hydrate, so their code and dependencies never ship; a `"use client"` at the root throws that away by dragging static work and heavy libs to the browser; keep formatting and data fetching on the server and isolate interactivity in small client leaves.

#### See it live

**Demo (react-demo):** a component tree colored server versus client with a client-JS meter, where the learner drags the `"use client"` boundary down the tree.

A widget showing a component tree (`ArticlePage` -> `ArticleHeader`, `MarkdownBody`, `SyntaxBlock`, `LikeButton`, `CommentBox`). Each node is colored **green = Server** or **blue = Client**. A draggable "`use client` boundary" line sits across the tree, and everything at or below it turns blue (client); everything above stays green (server). A **client-JS meter** at the top sums the KB of every blue node plus its imported libs. The tree is annotated with each node's library weight:

```tsx
// weights the meter sums when a node is blue (client)
MarkdownBody   -> heavy-markdown-lib      (~200KB)
SyntaxBlock    -> heavy-syntax-highlighter (~200KB)
LikeButton     -> react useState only      (~1KB)
CommentBox     -> form + useState          (~8KB)
```

Drag the boundary to the page root and almost the whole tree turns blue: the meter reads ~410KB. Drag it down so only `LikeButton` (and maybe `CommentBox`) sit below the line: those turn blue, `MarkdownBody` and `SyntaxBlock` go green, and the meter collapses to ~9KB.

**Watch:** drag the `"use client"` boundary down the tree and watch branches turn from blue to green as they move above the line, while the client-JS meter drops from ~410KB to ~9KB. This illustrates a **build-time / framework** behavior: the demo does not run a real RSC server, it shows which nodes would ship JS for a given boundary and sums their known weights, so treat the colors and the direction of the meter as faithful and the exact KB as representative. The lesson it proves is exact and load-bearing: moving the boundary down, not adding memoization, is what deletes the heavy libraries from the client.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Convert a markdown + syntax-highlight component that ships 400KB to the client for static content into a Server Component, keeping only the interactive bit client. You are given a `"use client"` component that renders formatted docs with a highlighter and also has a "copy code" button.

**Think about:**
- What ships to the client for a server component?
- What can server components not do?
- Where should `"use client"` live?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The `"use client"` at the top makes the whole component a client component, so its code and both heavy libraries (markdown + highlighter, ~400KB) ship to the browser and run there, even though the formatted output is completely static. Split it: server component for the static rendering, a tiny client leaf for the one interactive control.

```tsx
// Doc.tsx  -> Server Component (no "use client")
import { markdownToReact } from "heavy-markdown-lib";
import { highlight } from "heavy-syntax-highlighter";
import { CopyButton } from "./CopyButton";

export default function Doc({ source }: { source: string }) {
  const body = markdownToReact(source, { highlight }); // runs on the server
  return (
    <article>
      {body}
      <CopyButton text={source} /> {/* only this ships JS */}
    </article>
  );
}
```

```tsx
// CopyButton.tsx
"use client";
import { useState } from "react";
export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
      }}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
```

**WHY at the mechanism level:** a server component renders on the server to the RSC payload and never hydrates, so `markdownToReact` and `highlight` execute during the server render and only their *output* (the formatted markup) crosses the wire. Neither library is included in the client bundle. Only `CopyButton`, a `"use client"` leaf, ships JS and hydrates, because it needs `useState`, an `onClick`, and `navigator.clipboard`, none of which exist on the server. The 400KB stays server-side.

**How to spot it in review:** a `"use client"` at a page/route root, or heavy static/data libraries (markdown, highlighters, date, PDF, charting of static data) imported into a client component. Ask: does this subtree actually need state, effects, event handlers, or browser APIs? If not, it belongs on the server.

**Production symptom:** heavy libraries and static formatting work shipped to and executed on the client, inflating the bundle and the main-thread hydration cost for content that could have been plain server-rendered markup.

**Common misconception corrected:** "client memoization is the biggest perf lever." Often the bigger lever is *not shipping the code at all*. `React.memo`/`useMemo` make a client render cheaper; moving the work to a server component removes the client render (and its code) entirely. Reach for the boundary move before the memo.

**Self-check rubric:**
- [ ] I removed `"use client"` from the wrapper and kept the formatting on the server.
- [ ] I isolated the interactive control in a small `"use client"` leaf.
- [ ] I stated that a server component ships no component JS and never hydrates.
- [ ] I listed what server components cannot do (state, effects, event handlers, browser APIs).
- [ ] I corrected the "memoization is the biggest lever" misconception.

#### Practice: real-world variant (save, then reveal)

**Prompt:** At a docs platform, the article route is one big `"use client"` component that fetches the article with `useEffect` + `fetch`, renders it through a 300KB markdown/highlighter stack, and has a client-side theme toggle and a comment form at the bottom. Pages are slow to become interactive and the client bundle is dominated by the markdown stack. Redesign the server/client split, and explain how data fetching changes when the top of the tree becomes a Server Component.

**Model answer (revealed on demand):**

Invert the tree: make the route a **Server Component** that fetches and renders the static content, and demote only the genuinely interactive pieces to `"use client"` leaves.

```tsx
// article/[slug]/page.tsx  -> Server Component
import { markdownToReact } from "heavy-markdown-lib";
import { ThemeToggle } from "./ThemeToggle";
import { CommentForm } from "./CommentForm";

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  const article = await getArticle(params.slug); // await data directly, no useEffect
  return (
    <article>
      <ThemeToggle />                    {/* client leaf */}
      {markdownToReact(article.body)}    {/* server-rendered, no JS shipped */}
      <CommentForm slug={params.slug} /> {/* client leaf */}
    </article>
  );
}
```

**What changes for data fetching:** a server component can be `async` and `await getArticle(...)` directly, so the `useEffect` + `fetch` + loading-state dance disappears. The fetch runs on the server (closer to the database, with server-side caching and no client round-trip after load), and the browser receives already-rendered content instead of an empty shell that fetches after hydration. This also removes a client-side fetch waterfall: no "render, mount, effect fires, fetch, re-render" sequence.

**Where the client code lives:** `ThemeToggle` (needs `useState`/`localStorage`) and `CommentForm` (needs form state and a submit handler) become small `"use client"` components. The 300KB markdown/highlighter stack stays entirely on the server, since rendering markup is exactly what a server component is for. The client bundle drops to the few KB those two leaves need.

**WHY it is faster to interactive:** the heavy stack no longer downloads or hydrates on the client, so the main thread is free far sooner; only two tiny islands hydrate. And because the data is awaited during the server render, the article is present in the initial response rather than after a client effect, improving both perceived load and real Time To Interactive.

**Production symptom:** a content-heavy page that shows a blank shell then pops in, has a large client bundle dominated by formatting libraries, and stays non-interactive for a beat while a big client tree hydrates, all for content that is static once rendered.

**Self-check rubric:**
- [ ] I made the route a Server Component and awaited data directly (no `useEffect` fetch).
- [ ] I kept only `ThemeToggle` and `CommentForm` as `"use client"` leaves.
- [ ] I explained the markdown stack stays server-side and ships no JS.
- [ ] I connected the split to faster Time To Interactive (less hydration) and no client fetch waterfall.

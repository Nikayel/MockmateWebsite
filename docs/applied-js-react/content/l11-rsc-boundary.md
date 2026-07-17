> Module **11.1** (RSC & the Serialization Boundary) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [10.6](./l10-real-world-types.md) · Next: [11.2](./l11-hydration-streaming.md)

# L11 · RSC & the Serialization Boundary

After this module you can catch the family of bugs that live on the line between a Server Component and a Client Component: props that throw "Maximum call stack" or "cannot be serialized" only in the production build, a `"use client"` sitting at the top of a layout that quietly ships your entire tree as browser JavaScript, and a Server Action that trusts a captured `userId` while sitting on the public internet as an unauthenticated POST endpoint. You will learn what actually crosses the RSC wire, where React decides code runs, and why a Server Action is a network handler wearing the costume of a local function.

### ajr-l11-use-client-serialization: The "use client" boundary is a serialization seam

- **id:** `ajr-l11-use-client-serialization`  ·  **difficulty:** hard  ·  **est:** 14 min  ·  **demo:** react-demo  ·  **skills:** rsc, serialization, nextjs

#### Learn

A Server Component runs on the server, renders, and then React serializes the result into a stream called the Flight payload (React's RSC wire format). Anything you pass as a prop from a Server Component into a Client Component has to survive that serialization, because the Client Component is going to be re-created in the browser from the payload. That is the whole trick of the boundary: `"use client"` marks the seam where the server stops rendering and hands a **serialized description** across to code that will run in the browser.

So the real question for every prop is: does this value have a wire representation? Plain objects, arrays, strings, numbers, booleans, `null`, and (in modern React) even Promises and JSX elements do. Functions do not. Class instances do not. `Date`, `Map`, and `Set` do not survive as themselves.

```tsx
// app/dashboard/page.tsx  (Server Component, no "use client")
import { Chart } from "./chart"; // "use client"

export default async function Page() {
  const points = await db.metrics.findMany();
  return (
    <Chart
      data={new Map(points.map((p) => [p.day, p.value]))} // Map: no wire form
      onPick={(day) => console.log(day)}                   // function: no wire form
      createdAt={new Date()}                               // Date: serialized to a plain-ish value, not a Date
    />
  );
}
```

In a Next.js production build this fails hard: `Error: Functions cannot be passed directly to Client Components unless you explicitly expose it by marking it with "use server"`. The `Map` and `Date` are subtler. React can serialize a `Date`, but it comes back on the client as something you cannot rely on being a real `Date` instance across versions, and a `Map` triggers the "only plain objects can be passed" error.

The fix has three moves. Pass **plain data** (turn the `Map` into an object or array of pairs, turn the `Date` into an ISO string). Move **behavior** behind a Server Action (`"use server"`) so `onPick` becomes a callable reference React knows how to wire, or lift the handler into the client. And when you want server-rendered content inside a client shell, use the **donut / children pattern**: render the server content on the server and pass it as `children` into the Client Component, so the client wraps it without needing to serialize the logic that produced it.

```tsx
// server passes serialized props + server-rendered children into a client shell
<ChartShell data={Object.fromEntries(map)} createdAt={date.toISOString()}>
  <ServerLegend />   {/* rendered on the server, passed as an element */}
</ChartShell>
```

**Interview nuance:** `"use client"` does not mean "runs only in the browser." That component still renders on the server during SSR to produce the initial HTML; the directive marks it as a boundary that also hydrates and re-renders on the client. "Server Component" is the thing that runs once and never ships or hydrates.

**Interview nuance:** the boundary is one-directional for behavior. Data flows server to client as serialized props; behavior flows client to server only through explicitly marked Server Actions, never as a raw function reference.

Recap: everything crossing from a Server Component to a Client Component is serialized into the Flight payload, so only values with a wire representation (plain objects, arrays, primitives, JSX, Promises) may cross. Functions, class instances, `Date`, `Map`, and `Set` throw or degrade; fix by passing plain data, routing behavior through Server Actions, and passing server-rendered content as `children`.

#### See it live

**Demo (react-demo):** a toggle flips a single prop between serializable (a plain object) and non-serializable (a function, a `Date`, or a `Map`) as it crosses a Server-to-Client boundary, and the boundary reports what happens.

The widget draws two stacked boxes with a labeled seam between them: a green "Server Component" box on top and a blue "Client Component" box below, joined by an arrow labeled "Flight payload." A segmented control lets the learner pick the prop being sent: `plain object`, `function`, `Date`, or `Map`. A "Serialize and cross" button runs a small simulated serializer over the chosen value. The seam arrow turns **green** and the client box shows the received value when the prop is serializable, or turns **red** and shows the exact React error string when it is not. A side "on the wire" panel prints the JSON that actually crossed, so the learner sees the function simply vanish and the `Map` refuse.

```tsx
function canCross(value: unknown): { ok: boolean; wire?: string; error?: string } {
  if (typeof value === "function")
    return { ok: false, error: 'Functions cannot be passed directly to Client Components unless you explicitly expose it by marking it with "use server".' };
  if (value instanceof Map || value instanceof Set)
    return { ok: false, error: "Only plain objects, and a few built-ins, can be passed to Client Components from Server Components." };
  try {
    return { ok: true, wire: JSON.stringify(value) }; // Date stringifies but loses its type
  } catch {
    return { ok: false, error: "Value could not be serialized." };
  }
}

function Boundary({ prop }: { prop: unknown }) {
  const result = canCross(prop);
  return <Seam className={result.ok ? "green" : "red"} result={result} />;
}
```

**Watch:** picking `plain object` lights the seam green and the wire panel shows real JSON; picking `function` lights it red with React's "Functions cannot be passed directly" error and an empty wire; picking `Map` lights it red with the "only plain objects" error; picking `Date` crosses green but the wire panel shows a bare ISO string, proving it arrived as text, not a `Date`. This approximates the production build's serialization check in the browser (the real error is thrown by the Next.js bundler and RSC renderer at build/render time), so it illustrates the seam rather than reproducing the compiler.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Rewrite this Server Component so only serializable props cross the boundary, and move behavior behind a Server Action or into the client:

```tsx
// app/report/page.tsx  (Server Component)
import { Chart } from "./chart"; // "use client"

export default async function Page() {
  const rows = await db.metrics.findMany();
  return (
    <Chart
      data={new Map(rows.map((r) => [r.day, r.value]))}
      onPick={(day) => saveFavorite(day)}
      createdAt={new Date()}
    />
  );
}
```

**Think about:**
- What can cross the RSC wire?
- What does `"use client"` actually mark?
- What is the donut/children pattern?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

Three props are illegal across the seam: `data` is a `Map`, `onPick` is a function, and `createdAt` is a `Date`. Convert the first and third to plain data, and route the behavior through a Server Action.

```tsx
// app/report/actions.ts
"use server";
import { auth } from "@/lib/auth";

export async function saveFavorite(day: string) {
  const session = await auth();          // re-authorize inside the action
  if (!session) throw new Error("unauthorized");
  await db.favorites.create({ userId: session.userId, day });
}

// app/report/page.tsx  (Server Component)
import { Chart } from "./chart";           // "use client"
import { saveFavorite } from "./actions";

export default async function Page() {
  const rows = await db.metrics.findMany();
  const data = Object.fromEntries(rows.map((r) => [r.day, r.value])); // plain object
  return (
    <Chart
      data={data}
      onPick={saveFavorite}                 // a "use server" reference React can wire
      createdAt={new Date().toISOString()}  // ISO string; parse to Date in the client
    />
  );
}
```

**Mechanism:** the RSC renderer serializes the tree into the Flight payload, and only values with a wire representation survive. A `Map` and a `Date` instance have none as themselves, and a plain function has none at all, so React throws while producing the payload. A function marked `"use server"` is different: it serializes as a stable action reference (an id the client can call over the network), which is why `onPick={saveFavorite}` is allowed where an inline arrow is not.

**Spot in review:** any non-plain prop (`new Map`, `new Date`, an inline arrow handler, a class instance) crossing into a `"use client"` component, or a Client Component `import`ing a server-only module. Grep for `new Map(`/`new Date(` and inline `on*={(` at boundary call sites.

**Production symptom:** the page renders fine in dev with certain paths but the production build fails with "Functions cannot be passed directly to Client Components" or "Only plain objects can be passed," taking down the whole route.

**Misconception to correct:** "`"use client"` means this component only runs in the browser, so serialization does not apply." It still runs on the server during SSR to produce initial HTML; the boundary is exactly where props get serialized, which is why the rule bites.

**Self-check rubric:**
- [ ] `Map` became a plain object (or array of pairs) and `Date` became an ISO string.
- [ ] Behavior moved to a `"use server"` action, not an inline function prop.
- [ ] I can name why `onPick={saveFavorite}` is legal but `onPick={(d) => ...}` is not.
- [ ] I noted that the client still needs to parse the ISO string back to a `Date`.
- [ ] I stated the production build symptom, not just "it errors."

#### Practice: real-world variant (save, then reveal)

**Prompt:** At **Northwind Analytics**, a Server Component renders a `<PriceTable>` client island and passes `format={new Intl.NumberFormat("en-US", { currency: "USD" })}`, a `rowsById={new Map(...)}`, and `<Sparkline data={...} />` elements it built on the server. The build is green locally but the CI production build fails on `format`. Diagnose all three props, keep the server-built `Sparkline`s server-rendered, and show the corrected boundary.

**Model answer (revealed on demand):**

Only `format` fails the build today, but two of the three props are wrong and the third is a trap that hides work you want on the server.

`format` is an `Intl.NumberFormat` **class instance**: no wire representation, so RSC serialization throws. Do not pass the formatter; either pass the already-formatted strings from the server, or pass the plain options object and reconstruct the formatter inside the client island.

```tsx
// server: format on the server, ship strings
const rows = raw.map((r) => ({ id: r.id, label: fmt.format(r.price) }));
```

`rowsById` is a `Map`: also non-plain. Convert to `Object.fromEntries(rowsById)` or, better, to an ordered array since tables care about order and object key order is not guaranteed for numeric-like keys.

The `Sparkline` elements are the interesting case. JSX elements **are** serializable, so passing server-rendered `<Sparkline />` elements down as `children` or as an array prop is exactly right and is the donut pattern: the client `PriceTable` shell wraps content it did not have to compute.

```tsx
// app/prices/page.tsx  (Server Component)
export default async function Page() {
  const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  const rows = (await db.prices.findMany()).map((r) => ({
    id: r.id,
    label: fmt.format(r.price),
    spark: <Sparkline key={r.id} data={r.history} />, // server-rendered element, serializable
  }));
  return <PriceTable rows={rows} />; // rows: array of plain objects + JSX elements
}
```

**Mechanism:** the Flight serializer accepts primitives, plain objects/arrays, and React elements, so a server-rendered `<Sparkline>` crosses as a description of UI, while an `Intl.NumberFormat` or `Map` instance has no such description and throws. **Spot in review:** any `new Intl.*`, `new Map`, or other class instance handed to a `"use client"` component. **Production symptom:** exactly this "green locally, red in CI" split, because dev sometimes tolerates a non-plain value that the optimized production RSC serializer rejects. The senior instinct is: format and shape data on the server, pass plain data and pre-rendered elements across, never live objects with methods.

### ajr-l11-server-vs-client-components: Server vs Client Components: where code runs

- **id:** `ajr-l11-server-vs-client-components`  ·  **difficulty:** hard  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** rsc, architecture, nextjs

#### Learn

In the App Router every component is a Server Component by default. A Server Component runs once, on the server, during the request. It can `await` a database query, read a file, use secrets from `process.env`, and it never ships to the browser and never hydrates. What it cannot do: `useState`, `useEffect`, `useRef`, event handlers, or any browser API like `window`, `localStorage`, or `matchMedia`, because none of those exist on the server and the component has no client life in which to use them.

The moment you write `"use client"` at the top of a file, that file and **everything it imports** becomes part of the client bundle. This is the part people underestimate. `"use client"` is not a per-component switch; it is a boundary that pulls the whole downstream import graph into the browser.

```tsx
// app/dashboard/page.tsx
"use client"; // ← put here by reflex, because the counter needed useState

import { HugeChartLib } from "heavy-charts"; // 300kb
import { formatCurrency } from "@/lib/money"; // now client too

export default function Dashboard({ rows }) {
  const [count, setCount] = useState(0); // the only reason "use client" was added
  return (/* header, table, and one <button> */);
}
```

Marking the page forces `HugeChartLib`, `@/lib/money`, the table, the header, and everything else into the client bundle just so one `<button>` can call `setCount`. The RSC benefit (render on the server, ship zero JS for the static parts) is gone for the entire subtree.

The fix is to keep `"use client"` at the **leaves**. The page stays a Server Component that fetches and lays out; the tiny interactive piece becomes its own client island.

```tsx
// app/dashboard/page.tsx  (Server Component: no directive)
import { Counter } from "./counter"; // "use client" lives here
export default async function Dashboard() {
  const rows = await db.rows.findMany(); // server-only, never ships
  return (
    <main>
      <Header />
      <Table rows={rows} />
      <Counter /> {/* the only thing that hydrates */}
    </main>
  );
}
```

Now only `Counter` and its imports ship. `Table`, `Header`, and the query stay on the server.

**Interview nuance:** the rule of thumb is "push client down, pull data up." Data fetching wants to be as high (as server) as possible; interactivity wants to be as low (as leafy) as possible. A `"use client"` near the root is almost always a smell that the boundary was placed for convenience, not for the bundle.

**Interview nuance:** you can `import` a Server Component's output into a Client Component only as `children` or props, not by importing the server module directly. A Client Component importing a server-only file (say one that touches the database) is a compile error, and it is the other half of the same boundary the previous lesson covered.

Recap: Server Components run once on the server with full backend access and never hydrate, but cannot use state, effects, or browser APIs; `"use client"` marks a boundary that drags the whole import graph into the browser bundle, so place it at small interactive leaves and keep fetching and layout on the server.

#### See it live

**Demo (react-demo):** a component tree is colored server (green) vs client (blue) with a bundle-size meter, and the learner drags the `"use client"` marker up and down the tree.

The widget renders a small tree: `Page → [Header, Table, Toolbar → [Counter, ThemeToggle]]`. Each node has a mock byte cost (for example `HugeChartLib` on `Table` = 300kb). A draggable `"use client"` chip can be dropped on any node. Everything from that node **downward** turns blue (client) and its bytes sum into a "client bundle" meter at the top; everything above stays green (server) and contributes 0kb to the client bundle. Each blue node also shows a small badge: green "server APIs available (db, fs, env)" when server, or blue "hooks + browser APIs available" when client. Dropping the chip on `Page` turns the whole tree blue and the meter spikes; dropping it on `Counter` alone keeps the meter tiny.

```tsx
const NODES = {
  Page: { kb: 4, children: ["Header", "Table", "Toolbar"] },
  Header: { kb: 2, children: [] },
  Table: { kb: 300, children: [] },        // heavy chart lib
  Toolbar: { kb: 3, children: ["Counter", "ThemeToggle"] },
  Counter: { kb: 2, children: [] },
  ThemeToggle: { kb: 2, children: [] },
};

function clientBundleKb(rootOfClient: string): number {
  const walk = (id: string): number =>
    NODES[id].kb + NODES[id].children.reduce((s, c) => s + walk(c), 0);
  return walk(rootOfClient); // everything below the boundary ships
}
```

**Watch:** dragging `"use client"` onto `Page` sums every node (313kb) into the client meter and marks the whole tree "hydrates"; dragging it onto `Counter` shows 2kb and only `Counter` hydrates, while `Table` stays green with the "server APIs available" badge. This visualizes the import-graph rule; it approximates real bundle accounting (actual sizes come from your bundler, and shared modules dedupe), so treat the numbers as illustrative of direction, not exact output.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Split this component into a server shell plus a client island. It mixes a DB fetch, an interactive counter, and `window.matchMedia`:

```tsx
"use client";
import { db } from "@/lib/db";

export default async function Panel() {
  const stats = await db.stats.get();           // server-only
  const [likes, setLikes] = useState(0);        // needs client
  const isWide = window.matchMedia("(min-width: 900px)").matches; // browser only
  return (
    <section>
      <h2>{stats.title}</h2>
      <button onClick={() => setLikes((n) => n + 1)}>♥ {likes}</button>
      {isWide && <SideRail />}
    </section>
  );
}
```

**Think about:**
- What can a server component do that a client one cannot?
- What inflates the client bundle?
- Where should `"use client"` live?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

This component cannot exist as written: it is `"use client"` yet uses `await db.stats.get()` (server-only) and `window.matchMedia` (client-only) in the same body, and a Client Component cannot be `async` in this way. Split it: the fetch and heading stay on the server, the like button and the media query move into a small client island.

```tsx
// panel.tsx  (Server Component: no directive)
import { db } from "@/lib/db";
import { Likes } from "./likes";

export default async function Panel() {
  const stats = await db.stats.get(); // server-only, never ships
  return (
    <section>
      <h2>{stats.title}</h2>
      <Likes />
    </section>
  );
}

// likes.tsx
"use client";
import { useState, useEffect } from "react";

export function Likes() {
  const [likes, setLikes] = useState(0);
  const [isWide, setIsWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 900px)");
    const update = () => setIsWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return (
    <>
      <button onClick={() => setLikes((n) => n + 1)}>♥ {likes}</button>
      {isWide && <SideRail />}
    </>
  );
}
```

**Mechanism:** Server Components render once and never hydrate, so they get `await`, `db`, and secrets but no state, effects, or `window`. Client Components render on the server during SSR **and** re-render on the client, so `window.matchMedia` must run inside `useEffect` (it does not exist during SSR) and the initial state must be SSR-safe (`false`), or you get a hydration mismatch. Keeping `"use client"` on `Likes` means only `Likes` ships; `db` and the heading stay server-side.

**Spot in review:** an `async` component marked `"use client"`, any `window`/`document` reference read during render (not in an effect), or a `"use client"` file that imports `@/lib/db`. **Production symptom:** the build errors on the async client component, or it "works" but the whole panel ships as client JS and throws a hydration mismatch when `matchMedia` reads differently on server vs client. **Misconception to correct:** "I can use hooks anywhere as long as it is a function component." Hooks require `"use client"`; without it the component is a Server Component and `useState` is a build error.

**Self-check rubric:**
- [ ] The DB fetch stays in a Server Component (no `"use client"` on the shell).
- [ ] `useState`/the button live in a `"use client"` leaf.
- [ ] `window.matchMedia` is read inside `useEffect`, not during render.
- [ ] Initial `isWide` state is SSR-safe to avoid a hydration mismatch.
- [ ] I can explain why the original `async` + `"use client"` combination is illegal.

#### Practice: real-world variant (save, then reveal)

**Prompt:** On the **Helios** marketing site, the top-level `app/(marketing)/layout.tsx` was marked `"use client"` months ago so a `CookieBanner` could use `useState`. Lighthouse now flags 480kb of unused JS on every marketing page, and the hero, footer, and MDX article body all hydrate. Re-architect the boundary and explain the bundle mechanism. What is the single highest-leverage move?

**Model answer (revealed on demand):**

The single move: delete `"use client"` from the layout and push it down to the `CookieBanner` leaf. Because `"use client"` pulls the entire downstream import graph into the browser, a directive on the layout marked the hero, footer, MDX renderer, and every child of every marketing page as client code, which is where the 480kb and the needless hydration come from.

```tsx
// app/(marketing)/layout.tsx  (Server Component: directive removed)
import { CookieBanner } from "@/components/cookie-banner"; // "use client" lives here now
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Hero />          {/* server, 0kb client */}
      {children}        {/* MDX article, server-rendered */}
      <Footer />        {/* server, 0kb client */}
      <CookieBanner />  {/* the only island that hydrates */}
    </>
  );
}
```

**Mechanism:** a layout is the root of its segment's tree, so a `"use client"` there makes every descendant module part of the client bundle, even purely static ones, and each becomes a hydration target. Moving the directive to `CookieBanner` means only the banner and its imports ship; `Hero`, `Footer`, and the MDX body render once on the server and send zero JS. **Spot in review:** grep for `"use client"` in any `layout.tsx` or top-level `page.tsx`; a root-level directive is almost always misplaced. **Production symptom:** exactly this profile: large "unused JavaScript" in Lighthouse, slow Time to Interactive, and static content that still hydrates. The reason a junior reaches for the root directive is that the error ("useState is not allowed in Server Components") points at the layout, and marking the layout makes the error disappear; the senior fix is to isolate the one stateful leaf instead of promoting its parent.

### ajr-l11-server-actions-security: Server Actions are public POST endpoints

- **id:** `ajr-l11-server-actions-security`  ·  **difficulty:** hard  ·  **est:** 16 min  ·  **demo:** react-demo  ·  **skills:** rsc, server-actions, security

#### Learn

A Server Action looks like a function you call. It is actually a network endpoint. When you mark a function `"use server"`, the bundler compiles it to a stable **action id** and registers a route that accepts a POST. The client, instead of "calling the function," sends a POST carrying that action id and the arguments. This is what makes progressive enhancement work (a form can submit before any JS loads), and it is exactly why the security model is the same as any other public API route: **anything on the client can POST to it, with any body, at any time.**

The trap is closure capture. Anything a Server Action closes over from its enclosing scope is a **bound argument**, and bound arguments are serialized down to the client and sent back up with the call. So this is not the trusted local variable it looks like:

```tsx
// app/post/[id]/page.tsx  (Server Component)
export default async function Page({ params }) {
  const session = await auth();
  const userId = session.userId; // looks server-side and trusted

  async function deletePost(formData: FormData) {
    "use server";
    // userId was CAPTURED: it is serialized to the client and sent back on POST
    await db.post.delete({ where: { id: formData.get("id"), userId } });
  }

  return <form action={deletePost}><input type="hidden" name="id" defaultValue={params.id} /><button>Delete</button></form>;
}
```

`userId` is on the wire. An attacker opens dev tools, sees the encoded action reference and the bound `userId`, and can POST the action directly with **any** `id` and a tampered or replayed `userId`. There is no UI in the loop, no button, no client validation. The action just runs.

The fixes are the fixes for any endpoint. **Re-authenticate inside the action** from the session (a cookie the server reads), never trust a captured or submitted user id. **Validate** the inputs with Zod because `formData.get("id")` is `unknown` attacker-controlled text. And make destructive actions **idempotent** so a replayed POST cannot double-charge or corrupt state.

```tsx
// app/post/actions.ts
"use server";
import { z } from "zod";
import { auth } from "@/lib/auth";

const DeleteInput = z.object({ id: z.string().uuid() });

export async function deletePost(formData: FormData) {
  const session = await auth();                 // re-read the cookie server-side
  if (!session) throw new Error("unauthorized");
  const { id } = DeleteInput.parse({ id: formData.get("id") }); // validate
  await db.post.deleteMany({ where: { id, userId: session.userId } }); // scoped + idempotent
}
```

**Interview nuance:** `deleteMany` (or a delete guarded by `WHERE userId = ...`) is doing double duty: it scopes the delete to the caller's own rows (authorization at the data layer) and it is idempotent (deleting an already-deleted row affects zero rows instead of throwing). That is the difference between "checked the user" and "made it impossible to touch another user's row."

**Interview nuance:** never put an authorization decision in a bound argument or a hidden form field. Both are attacker-controlled. Authorization is a fact the server derives from the session on every call, not a value the client hands you.

Recap: a Server Action compiles to a public POST endpoint identified by an action id, and closure variables become serialized bound arguments visible and tamperable on the wire, so every action must re-authenticate from the session, validate its inputs, and make destructive operations idempotent, exactly as you would for a hand-written API route.

#### See it live

**Demo (react-demo):** a form calls a Server Action while a network panel shows the encoded action id and the serialized bound arguments, plus a "replay" button that fires the POST again with no UI.

The widget renders a small "Delete post" form. Submitting it animates a POST into a network panel that displays three fields: the **action id** (an opaque hash like `7f3a…`), the **bound args** (showing `userId: "u_42"` captured from the closure, highlighted red as "visible to the client"), and the **form data** (`id: "p_9"`). A "Replay POST" button re-sends the exact request without touching the form, and an "Edit and replay" mode lets the learner change `userId` to `u_99` or `id` to someone else's post before sending. A server panel shows the handler running: in "insecure" mode it deletes whatever was sent; a "secure" toggle inserts a `session` re-check and a Zod parse, so the tampered replay returns `unauthorized` instead.

```tsx
// what the client actually sends (simplified)
const wireRequest = {
  actionId: "7f3a9c...",             // stable endpoint id from the bundler
  boundArgs: [{ userId: "u_42" }],   // captured closure var, serialized to the client
  formData: { id: "p_9" },
};

function insecureHandler(req) {
  return db.delete(req.formData.id, req.boundArgs[0].userId); // trusts the wire
}
function secureHandler(req, session) {
  if (!session) return "unauthorized";                 // re-auth, ignore boundArgs.userId
  return db.deleteScoped(req.formData.id, session.userId);
}
```

**Watch:** submitting once shows the captured `userId` sitting in plain view in the bound args; hitting "Replay POST" runs the delete again with no UI, proving the endpoint is directly callable; editing `userId` to `u_99` and replaying succeeds in insecure mode and fails with `unauthorized` in secure mode. This is a faithful simulation of the request shape (real Next.js encodes the action id and bound args in the payload); the exact encoding differs, but the security property (client-visible, replayable, tamperable) is real, not illustrative.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Fix this `deletePost` Server Action, which trusts a captured `userId` and does no auth check. Re-authenticate from the session, validate with Zod, and add idempotency:

```tsx
export default async function Page({ params }) {
  const { userId } = await auth();
  async function deletePost(formData: FormData) {
    "use server";
    const id = formData.get("id");
    await db.post.delete({ where: { id } }); // no auth, trusts captured userId, throws if gone
  }
  return <form action={deletePost}><input type="hidden" name="id" defaultValue={params.id} /><button>Delete</button></form>;
}
```

**Think about:**
- Can the action be invoked without the UI?
- What happens to captured closure variables?
- Where must authorization live?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The action has three holes: no authorization at all (`delete` by `id` alone deletes anyone's post), a captured `userId` it does not even use but which is exposed on the wire, and `formData.get("id")` passed unvalidated. Move it to its own file, re-auth inside, validate, and scope the delete so it is both authorized and idempotent.

```tsx
// app/post/actions.ts
"use server";
import { z } from "zod";
import { auth } from "@/lib/auth";

const DeleteInput = z.object({ id: z.string().uuid() });

export async function deletePost(formData: FormData) {
  const session = await auth();                        // re-read session cookie server-side
  if (!session) throw new Error("unauthorized");
  const { id } = DeleteInput.parse({ id: formData.get("id") });
  await db.post.deleteMany({ where: { id, userId: session.userId } }); // scoped + idempotent
}
```

**Mechanism:** the action compiled to a public endpoint with a stable id, so a client can POST it directly. Any variable captured from the page scope (`userId`) is serialized as a bound argument, visible in dev tools and tamperable, so it can never be the basis for a permission decision. Re-reading `session` inside the action derives identity from the httpOnly cookie the server controls, which the client cannot forge. `deleteMany` with a `userId` filter scopes the operation to the caller's own row (authorization at the data layer) and returns a zero count instead of throwing when the row is already gone, which makes a replayed POST harmless.

**Spot in review:** a `"use server"` function that mutates without an `auth()` call, that reads identity from a bound arg or hidden field, or that passes `formData.get(...)` straight into a query. **Production symptom:** an attacker scripts the endpoint and deletes or charges across accounts with no UI involved, or a double-submit throws a 500 on the second identical POST. **Misconception to correct:** "a Server Action is a trusted local function because it is defined next to server code." It is a network handler; treat it with the same suspicion as a hand-written `route.ts` POST, because that is literally what it compiles to.

**Self-check rubric:**
- [ ] `auth()` is called inside the action, not captured from the page.
- [ ] The delete is scoped by `session.userId`, not a submitted/captured id.
- [ ] Input is validated with Zod before it reaches the query.
- [ ] The destructive path is idempotent (a replay affects zero rows, does not throw).
- [ ] I can explain why a captured closure var is attacker-visible.

#### Practice: real-world variant (save, then reveal)

**Prompt:** At **Ledger**, a fintech, a `transferFunds` Server Action captures `const fromAccount = session.accountId` at render time and takes `formData` with `to` and `amount`. Security review finds you can replay the POST to double a transfer and can tamper `to`. Harden it: re-auth, validate money, enforce authorization at the data layer, and make it exactly-once. Name what breaks if you only add a `session` check.

**Model answer (revealed on demand):**

Re-authenticating is necessary but not sufficient here, because money moves and the danger is the **replay**, not just the identity. A `session` check stops an unauthenticated caller, but an authenticated user can still hit "Replay POST" and run the transfer twice. Exactly-once needs an idempotency key.

```tsx
// app/transfer/actions.ts
"use server";
import { z } from "zod";
import { auth } from "@/lib/auth";

const Transfer = z.object({
  to: z.string().uuid(),
  amount: z.coerce.number().int().positive().max(1_000_000), // cents, bounded
  idempotencyKey: z.string().uuid(),
});

export async function transferFunds(formData: FormData) {
  const session = await auth();
  if (!session) throw new Error("unauthorized");
  const input = Transfer.parse({
    to: formData.get("to"),
    amount: formData.get("amount"),
    idempotencyKey: formData.get("idempotencyKey"),
  });
  await db.$transaction(async (tx) => {
    const seen = await tx.transfer.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (seen) return; // already processed: replay is a no-op
    await tx.transfer.create({ data: { ...input, from: session.accountId } }); // from = session, never captured/submitted
    await tx.ledger.move(session.accountId, input.to, input.amount);
  });
}
```

**Mechanism:** `fromAccount` was a captured closure var on the wire, so it could not be trusted for authorization; deriving `from` from `session.accountId` inside the action fixes both the tamper and the disclosure. The `idempotencyKey` (generated per form render, unique-constrained in the DB) turns the second identical POST into a no-op inside a transaction, which is what "exactly-once" means for money. Validation bounds `amount` to a positive integer of cents so a negative or fractional or absurd value cannot slip through. **Spot in review:** any money-moving action without a transaction + idempotency key, or one that reads the source account from client input. **Production symptom:** duplicate transfers from double-clicks, retries, or scripted replays, and cross-account transfers if `from` is tamperable. The senior framing: authorization answers "who," validation answers "is this input sane," and idempotency answers "what if this exact call arrives twice," and a fintech mutation needs all three, not just the first.

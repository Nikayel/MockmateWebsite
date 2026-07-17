> Module **8.4** (Context & Stores) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [8.3](./l8-composition-colocation.md) · Next: [8.5](./l8-virtualization-transitions.md)

# L8 · Context & Stores

React Context has no built-in selector: every consumer re-renders whenever the provider's value reference changes, and external stores wired through `useSyncExternalStore` throw or loop the moment their snapshot returns a fresh reference each call. After this module you can catch the two failures that make "just use Context" and "just wire up the store" quietly expensive: a fat provider value that flashes an entire subtree on an unrelated field change, and a `getSnapshot` that builds a new array on every call and either loops forever or trips React's "getSnapshot should be cached" warning.

### ajr-l8-context-splitting: Context re-renders and splitting providers

- **id:** `ajr-l8-context-splitting`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** react, context, performance

#### Learn

When a component calls `useContext(Ctx)`, React subscribes it to that context's **value identity**. On every provider render, React compares the new `value` prop to the previous one with `Object.is`. If they differ, every consumer of that context re-renders, regardless of which field the consumer actually reads. Context does not subscribe per field. It subscribes per value.

That single fact causes most "why is my whole app re-rendering" reports. Here is the classic shape:

```tsx
const AppContext = React.createContext(null);

function AppProvider({ children }) {
  const [user, setUser] = useState({ name: "Ada" });
  const [theme, setTheme] = useState("light");
  // new object literal EVERY render
  return (
    <AppContext.Provider value={{ user, setUser, theme, setTheme }}>
      {children}
    </AppContext.Provider>
  );
}

function DeepConsumer() {
  const { user } = useContext(AppContext); // only reads user
  return <div>{user.name}</div>;
}
```

Flip the theme and `AppProvider` re-renders. The `value={{ ... }}` literal is a brand new object, so `Object.is(prevValue, nextValue)` is `false`, so `DeepConsumer` re-renders even though `user` never changed. Multiply that by a large subtree and a theme toggle repaints the world.

There are two independent fixes, and good code often uses both.

**Fix 1: memoize the value.** Wrap it so its reference only changes when a real input changes:

```tsx
const value = useMemo(
  () => ({ user, setUser, theme, setTheme }),
  [user, theme] // setters from useState are stable, so they are not needed here
);
```

This stops re-renders caused purely by the provider re-rendering for unrelated reasons. But it does not help `DeepConsumer` when `theme` genuinely changes: `theme` is in the dependency array, so the memo produces a new object, and every consumer still re-renders. Memoization fixes churn, not the coupling between fields.

**Fix 2: split the context.** Put unrelated concerns in separate providers so a change to one cannot touch consumers of the other:

```tsx
const UserContext = React.createContext(null);
const ThemeContext = React.createContext(null);
```

Now `DeepConsumer` calls `useContext(UserContext)` and is physically not subscribed to theme. A theme change re-renders `ThemeContext` consumers only. A common finer split is state vs dispatch: a `StateContext` (changes often) and a `DispatchContext` (stable for the component's life), so components that only dispatch never re-render on state changes.

Interview nuance: if you truly need one context but want per-field subscription, that is what `use-context-selector` and external stores (Zustand, Redux via `useSelector`) exist for. Context alone cannot do it. Say that out loud in an interview; it signals you know the boundary of the primitive rather than blaming Context.

Recap: consumers subscribe to value identity, not fields; `useMemo` kills churn re-renders; splitting providers kills cross-field re-renders; per-field subscription requires a store or selector library.

#### See it live

**Demo (react-demo):** one `AppContext.Provider` feeding three consumers (one reads `user`, one reads `theme`, one reads nothing) each with a render-count badge, plus a toggle that switches between the fat single context and split `UserContext` + `ThemeContext`.

Widget: three cards side by side labeled "reads user", "reads theme", "reads nothing", each showing a badge that increments every time that card renders. Two buttons at the top: "Change theme" and "Change user name". A mode switch toggles between "Single fat context" and "Split contexts". The learner clicks "Change theme" repeatedly and watches the badges.

```tsx
function ConsumerCard({ label, renderCount }) {
  // renderCount is incremented in a ref-based effect on each render
  return (
    <div className="card">
      <span>{label}</span>
      <span className="badge">renders: {renderCount}</span>
    </div>
  );
}

// SINGLE mode: value={{ user, setUser, theme, setTheme }} (fresh object)
// SPLIT mode:  <UserContext.Provider value={userValue}>
//                <ThemeContext.Provider value={themeValue}>
// In split mode userValue and themeValue are each useMemo'd on their own state.
```

**Watch:** In "Single fat context" mode, clicking "Change theme" bumps the badge on all three cards, including "reads nothing", because they all subscribe to the same fresh value object. Switch to "Split contexts" mode and click "Change theme" again: only the "reads theme" card's badge increments. The "reads user" and "reads nothing" cards stay frozen. That contrast proves the re-render is driven by value identity, not by which field you read.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Stop a `DeepConsumer` that only reads `user` from re-rendering when only `theme` changes. Rewrite the provider below by splitting the context and/or memoizing the value, and say why the original re-rendered the whole subtree.

```tsx
const AppContext = React.createContext(null);

function AppProvider({ children }) {
  const [user, setUser] = useState({ name: "Ada" });
  const [theme, setTheme] = useState("light");
  return (
    <AppContext.Provider value={{ user, setUser, theme, setTheme }}>
      {children}
    </AppContext.Provider>
  );
}

function DeepConsumer() {
  const { user } = useContext(AppContext);
  return <div>{user.name}</div>;
}
```

**Think about:**
- Do consumers re-render by field or by value identity?
- What are the two fixes?
- Does context have a built-in selector?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The original re-renders every consumer on any provider render because `value={{ user, setUser, theme, setTheme }}` is a new object literal each time. `useContext` subscribes to that object's identity, and React compares it with `Object.is`. A `setTheme` call re-renders `AppProvider`, produces a new value object, `Object.is(prev, next)` is `false`, and `DeepConsumer` re-renders even though `user` is untouched. Consumers subscribe by value identity, not by field. Context has no built-in selector, so you cannot ask it for "just the user slice".

The robust fix splits the context so `user` and `theme` cannot affect each other:

```tsx
const UserContext = React.createContext(null);
const ThemeContext = React.createContext(null);

function AppProvider({ children }) {
  const [user, setUser] = useState({ name: "Ada" });
  const [theme, setTheme] = useState("light");

  const userValue = useMemo(() => ({ user, setUser }), [user]);
  const themeValue = useMemo(() => ({ theme, setTheme }), [theme]);

  return (
    <UserContext.Provider value={userValue}>
      <ThemeContext.Provider value={themeValue}>
        {children}
      </ThemeContext.Provider>
    </UserContext.Provider>
  );
}

function DeepConsumer() {
  const { user } = useContext(UserContext); // not subscribed to theme
  return <div>{user.name}</div>;
}
```

Now a `setTheme` produces a new `themeValue`, but `userValue` keeps its reference (its `useMemo` deps did not change), so `DeepConsumer` does not re-render. `useMemo` on each value also stops churn re-renders from unrelated parent renders.

How to spot it in review: any `<Ctx.Provider value={{ ... }}>` with an inline object, especially a fat one that mixes unrelated concerns (auth, theme, feature flags) in one value. That is a re-render magnet.

Production symptom: toggling a trivial UI preference (theme, sidebar open) janks a large list or an expensive chart, because those subtrees consume the same fat context and repaint on the unrelated field change.

Common misconception to correct: "I only destructure `user`, so I only re-render on `user` changes." Destructuring is just reading a property after the render was already triggered. Subscription happens at the context value level, before your destructure runs.

**Self-check rubric:**
- [ ] Named `Object.is` on the whole value object as the trigger, not the field.
- [ ] Gave both fixes: `useMemo` the value and split the context.
- [ ] Stated that Context has no per-field selector out of the box.
- [ ] Provided corrected code where the user consumer is not subscribed to theme.
- [ ] Named a production symptom (unrelated toggle janks an expensive subtree).

#### Practice: real-world variant (save, then reveal)

**Prompt:** Diagnose the "cart flicker" incident. An e-commerce app wraps the whole tree in one `StoreContext` holding `{ cart, addToCart, user, currency, setCurrency, theme, setTheme }`. Product managers report that opening the mini-cart drawer (which updates `cart`) makes the entire product grid, header, and footer visibly flash, and scroll position jumps on low-end devices. Explain why, and lay out a splitting strategy that fixes it without turning ten components into context wiring boilerplate.

**Model answer (revealed on demand):**

The whole tree flashes because one fat `StoreContext` couples every unrelated concern to one value identity. Adding to the cart re-renders the provider, mints a new `{ cart, addToCart, user, currency, ... }` object, and `Object.is` fails for every consumer: the product grid (reads `currency`), the header (reads `user`), and the footer (reads `theme`) all re-render even though only `cart` changed. On low-end devices that full-tree re-render is the scroll jump.

Splitting strategy, ordered by how often each slice changes:

```tsx
const CartStateContext = React.createContext(null);   // changes often
const CartActionsContext = React.createContext(null); // stable for app life
const SessionContext = React.createContext(null);     // user, rarely changes
const PrefsContext = React.createContext(null);       // currency, theme
```

The key move is the state-vs-actions split on the cart. `addToCart` is stable (wrap it in `useCallback` with an empty dep, or derive it from a reducer's `dispatch`), so put it in `CartActionsContext`. Components with an "Add" button consume only `CartActionsContext` and never re-render when the cart contents change. Only components that actually display cart contents (the drawer, the item count badge) consume `CartStateContext`.

To avoid boilerplate, expose a tiny hook per slice: `useCartState()`, `useCartActions()`, `useSession()`, `usePrefs()`, each doing the `useContext` and a null check. Components import a hook, not a context object.

How to spot it in review: a single context named `AppContext` / `StoreContext` / `GlobalContext` whose value type has more than three or four unrelated fields. The name and the width are the smell.

Production symptom to cite: interaction latency and layout jank on the p75 device, not the p50. On a fast laptop the extra re-renders are invisible, which is exactly why the bug survives to production. If per-field subscription is genuinely needed inside one slice (for example a huge cart where each row should update independently), that is the point to reach for Zustand or `use-context-selector`, because Context alone still cannot subscribe by field.

### ajr-l8-usesyncexternalstore-snapshot: useSyncExternalStore getSnapshot must be cached

- **id:** `ajr-l8-usesyncexternalstore-snapshot`  ·  **difficulty:** hard  ·  **est:** 14 min  ·  **demo:** react-demo  ·  **skills:** react, useSyncExternalStore, stores

#### Learn

`useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot?)` is React's official way to read from a store that lives outside React (a Redux store, a Zustand store, `window.matchMedia`, a WebSocket cache). React calls `getSnapshot` to read the current value, then after every render and after every store notification it calls `getSnapshot` again and compares the new result to the previous one with `Object.is`. If they differ, React re-renders. That comparison is the whole contract, and it is where people fall in.

The rule: `getSnapshot` must return the **same reference** as long as the underlying data has not changed. If it builds a new object or array on every call, `Object.is(prev, next)` is always `false`, so React concludes the store is changing on every check, re-renders, calls `getSnapshot` again, sees another new reference, re-renders again. That is an infinite loop. In development React detects it and throws `The result of getSnapshot should be cached to avoid an infinite loop`.

Here is the trap in its most common form, a derived array:

```tsx
function useActiveItems() {
  return useSyncExternalStore(
    store.subscribe,
    () => store.getState().items.filter((i) => i.on) // NEW array every call
  );
}
```

`filter` always returns a new array. Even when `items` is byte-for-byte identical between calls, the reference differs, so React never settles. `map`, `slice`, spread (`{ ...state }`), and `Object.keys(...)` all have the same problem: they manufacture a fresh reference on each call.

The fix is to cache the derived value and only recompute it when the inputs actually change:

```tsx
let lastItems = null;
let lastActive = [];

function getActiveSnapshot() {
  const items = store.getState().items;
  if (items !== lastItems) {
    lastItems = items;
    lastActive = items.filter((i) => i.on); // recompute only when items ref changes
  }
  return lastActive; // stable reference between real changes
}
```

This requires the store to update `items` by replacing its reference on real mutations (immutable update), which is exactly what Redux and Zustand do. Now `getSnapshot` returns the same `lastActive` array until `items` is replaced, `Object.is` reports "no change", and the loop stops.

Two more things a correct implementation needs. First, provide `getServerSnapshot` if the component renders on the server, or hydration will mismatch and React will warn. Second, if `getSnapshot` can return raw store fields that are already stable (return `state.items` directly, not `state.items.filter(...)`), you avoid the whole problem, because the store already caches the reference for you.

Interview nuance: this is precisely why Zustand's and Redux Toolkit's selectors take an equality function and why `useSelector` defaults to `Object.is`. A selector that returns `state.a` is fine on the default. A selector that returns `{ a: state.a, b: state.b }` or `state.list.map(...)` returns a new reference every call and will re-render on every dispatch (or loop under `useSyncExternalStore` directly), which is why you reach for `shallowEqual` or a memoized selector (`reselect`, `createSelector`). Same root cause, same fix, different wrapper.

Recap: `getSnapshot` is `Object.is`-compared to its last result; deriving inline (`filter`/`map`/spread) returns a fresh reference every call and loops or throws; cache the derived value keyed on the source reference; provide `getServerSnapshot`; selectors need `shallowEqual` for the same reason.

#### See it live

**Demo (react-demo):** two panels driving the same tiny external store. Panel A uses an uncached `getSnapshot` that calls `.filter(...)` inline; Panel B uses a cached snapshot. Each panel has a render-count badge and a button "Trigger unrelated store notification".

Widget: a shared store with `{ items: [...], version: 0 }`. Two components read from it. Panel A's badge spins upward on its own (and, with React's loop guard on, surfaces the "getSnapshot should be cached" error in an inline error box) even without user interaction. Panel B's badge sits still. Clicking "Trigger unrelated store notification" (which bumps `version` but not `items`) leaves Panel B's badge unchanged and keeps Panel A spinning.

```tsx
const store = createStore({ items: [{ id: 1, on: true }, { id: 2, on: false }], version: 0 });

// A) UNCACHED: new array every call -> loop / "should be cached"
function useActiveA() {
  return useSyncExternalStore(store.subscribe, () =>
    store.getState().items.filter((i) => i.on)
  );
}

// B) CACHED: stable reference until items ref changes
let lastItems = null, lastActive = [];
function getActiveB() {
  const items = store.getState().items;
  if (items !== lastItems) { lastItems = items; lastActive = items.filter((i) => i.on); }
  return lastActive;
}
function useActiveB() {
  return useSyncExternalStore(store.subscribe, getActiveB);
}
```

**Watch:** Panel A's render badge climbs on its own with no clicks, and in development the inline error box shows "The result of getSnapshot should be cached to avoid an infinite loop". Panel B renders once and holds. Triggering an unrelated notification (`version++`, `items` untouched) never re-renders Panel B, because `getActiveB` returns the same cached array. That proves React compares `getSnapshot` results by reference and that caching keyed on the source reference is what makes it settle. Note: this is genuinely live React behavior, not an approximation, the loop and the warning are the real runtime, though the error is thrown only in development builds.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Explain the infinite loop in `useSyncExternalStore(sub, () => state.items.filter(i => i.on))` and fix it by caching the derived snapshot. Give the corrected `getSnapshot` and say what must be true about the store for the fix to hold.

**Think about:**
- Why does a new ref each call loop?
- What must a mutable store return?
- Why do Zustand/Redux selectors need shallow equality?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The loop comes from `Object.is`. After each render and each store notification, React calls `getSnapshot`, compares the result to the previous result with `Object.is`, and re-renders if they differ. `state.items.filter(...)` returns a brand new array on every call, so even when the data is unchanged the reference differs, React reads that as "the store changed", re-renders, calls `getSnapshot` again, gets yet another new array, and re-renders forever. In development React catches this and throws "The result of getSnapshot should be cached to avoid an infinite loop".

The fix caches the derived array and only recomputes when the source reference changes:

```tsx
let lastItems = null;
let lastActive = [];

function getActiveSnapshot() {
  const items = store.getState().items;
  if (items !== lastItems) {
    lastItems = items;
    lastActive = items.filter((i) => i.on);
  }
  return lastActive; // same reference until items is replaced
}

useSyncExternalStore(store.subscribe, getActiveSnapshot, getActiveSnapshot);
```

For this to hold, the store must return a **new `items` reference only when `items` actually changes** and keep the same reference otherwise. That is standard immutable update: Redux reducers and Zustand's `set` replace the slice on real writes and leave it untouched otherwise. If the store mutates `items` in place (keeps the same array reference but changes contents), the cache check `items !== lastItems` is `false`, and your snapshot goes stale. Immutable updates upstream are a hard requirement, not a style preference.

How to spot it in review: any `getSnapshot`, or any Redux/Zustand selector, that calls `.filter`, `.map`, `.slice`, spreads (`{ ...x }`), or builds an object/array literal on each call. Returning a raw stored field (`() => state.items`) is safe; deriving inline is not.

Production symptom: a hard error overlay in development ("should be cached"), or in production a frozen tab and a pegged CPU as the component re-renders in a tight loop, sometimes only on the route where that store is mounted.

Misconception to correct: "getSnapshot can compute and return a derived array inline, that is what it is for." It cannot. `getSnapshot` must return a value that is reference-stable between real changes. Derivation belongs behind a cache (a memoized selector, or the manual reference check above), never inline in the snapshot.

**Self-check rubric:**
- [ ] Named `Object.is` on the `getSnapshot` result as the loop cause.
- [ ] Gave a cached `getSnapshot` that returns a stable reference between changes.
- [ ] Stated the store must replace `items` immutably for the cache to work.
- [ ] Provided `getServerSnapshot` (or noted it is needed for SSR/hydration).
- [ ] Connected it to why Redux/Zustand selectors use `shallowEqual`/memoized selectors.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Fix the "dashboard freezes on load" incident. A trading dashboard subscribes to a price store via a custom `usePrices` hook: `useSyncExternalStore(sub, () => Object.entries(store.getState().prices).map(([sym, p]) => ({ sym, ...p })))`. In development it throws "getSnapshot should be cached"; a teammate silenced it by wrapping the map in `useMemo` inside the hook and now production tabs peg the CPU. Explain why the `useMemo` did not fix it, and give a correct implementation that survives 50 price updates per second.

**Model answer (revealed on demand):**

`useMemo` inside the hook cannot fix it because `useMemo` only caches across renders of the same component instance, but `useSyncExternalStore` calls `getSnapshot` outside the render cycle, during React's store-change check, and it needs a stable reference there. Worse, `getSnapshot` is passed as the raw function, so React calls the underlying `Object.entries(...).map(...)` directly, not your memoized value. `Object.entries` plus `.map` and the inner `{ sym, ...p }` spread all mint fresh references on every call, so `Object.is` always fails and the loop is unchanged. Silencing the dev warning did not remove the loop, it just hid it until production, where the pegged CPU is that same loop running flat out.

The correct implementation caches the derived array keyed on the source reference, so it is stable until prices actually change:

```tsx
let lastPrices = null;
let lastRows = [];

function getPriceRows() {
  const prices = store.getState().prices;
  if (prices !== lastPrices) {
    lastPrices = prices;
    lastRows = Object.entries(prices).map(([sym, p]) => ({ sym, ...p }));
  }
  return lastRows;
}

function usePrices() {
  return useSyncExternalStore(store.subscribe, getPriceRows, getPriceRows);
}
```

The store must replace `prices` immutably on each tick (Redux/Zustand do). Now `getSnapshot` returns the same `lastRows` array between updates, the loop stops, and a real price change recomputes exactly once.

At 50 updates per second there is a second concern beyond correctness: even a correct snapshot re-renders every consumer on every tick, which repaints the whole grid 50 times a second. The production fix is to narrow subscriptions so each row subscribes to its own symbol (a selector per symbol, or a store that notifies per key), plus batching or a transition so paint stays under one frame. But the freeze in this incident is purely the uncached snapshot, and the reference-stable `getSnapshot` above is what stops the CPU peg.
